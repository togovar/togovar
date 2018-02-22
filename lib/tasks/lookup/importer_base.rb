require 'csv'
require 'zlib'

module Tasks
  module Lookup
    class ImporterBase
      class << self
        attr_accessor :logger
      end

      def initialize(*args)
        options = args.last.is_a?(Hash) ? args.pop : {}

        @file_path     = args.first
        @batch_num     = options.delete(:batch_num) || 1000
        @show_progress = options.delete(:progress)

        raise("Unknown options: #{options.inspect}") unless options.empty?
      end

      def start
        log("start import #{@file_path}", :info)

        if @show_progress
          task_with_progress
        else
          task(nil)
        end

        log("finish #{@file_path}", :info)
      end

      private

      def task(thread)
        # OVERRIDE ME
      end

      def task_with_progress
        Thread.abort_on_exception = false

        thread = Thread.new do
          task(Thread.current)
        end

        progress = ProgressWrapper.new(format:     '%t|%B| %J%% %a (%E)',
                                       proc_total: proc { thread.send(:[], :total) },
                                       proc_done:  proc { thread.send(:[], :done) })

        begin
          progress.update until thread.join(0.5)
        rescue StandardError => e
          log([@file_path.to_s, e.message, e.backtrace].flatten.join("\n"), :error)
        end
        progress.finish
      end

      def log(msg, level = :info)
        return unless (logger = self.class.logger)

        logger.send(level, msg) if msg
        yield logger if block_given?
      end

      def reader
        case @file_path
          when /\.gz$/
            Zlib::GzipReader
          else
            File
        end
      end

      def filter_blank(str)
        return nil if str.blank? || '-'.freeze == str
        str
      end

      def to_int(str)
        return nil if filter_blank(str).nil?
        Integer(str)
      rescue ArgumentError => e
        msg = e.message
        msg << " at line #{@io.lineno}"
        log(msg, :warn)
        nil
      end

      def to_float(str)
        return nil if filter_blank(str).nil?
        Float(str)
      rescue ArgumentError => e
        msg = e.message
        msg << " at line #{@io.lineno}"
        log(msg, :warn)
        nil
      end
    end
  end
end

class Hash
  def deep_reject(&blk)
    dup.deep_reject!(&blk)
  end

  def deep_reject!(&blk)
    each do |k, v|
      v.each { |x| x.deep_reject!(&blk) } if v.is_a?(Array)
      v.deep_reject!(&blk) if v.is_a?(Hash)
      delete(k) if blk.call(k, v)
    end
  end
end

class CSV
  def self.count_row(path)
    count = 0
    (path.match?(/\.gz$/) ? Zlib::GzipReader : File).open(path) do |f|
      while (l = f.gets)
        count += 1 unless l.match?(/^#/)
      end
    end
    count
  end

  def self.count_uniq_row(*args)
    path    = args.first
    options = args.last.is_a?(Hash) ? args.pop : {}
    values  = []
    (path.match?(/\.gz$/) ? Zlib::GzipReader : File).open(path) do |f|
      CSV.new(f, options).each do |row|
        values << (yield row)
      end
    end
    values.uniq.count
  end
end

class ProgressWrapper
  extend Forwardable

  attr_reader :progress
  attr_accessor :proc_total
  attr_accessor :proc_done

  DEFAULT_OPTIONS = { proc_total: proc { nil },
                      proc_done:  proc { nil } }.freeze

  def initialize(*args)
    options = DEFAULT_OPTIONS.merge(args.last.is_a?(Hash) ? args.pop : {})

    @proc_total = options.delete(:proc_total)
    @proc_done  = options.delete(:proc_done)

    @progress = ProgressBar.create(*args, options)
  end

  def update
    update_total
    update_progress
  end

  def_delegators(:@progress, :finish)

  private

  def update_total
    progress.total = proc_total.call
    progress.increment if progress.total.nil?
  end

  def update_progress
    return unless (total = progress.total)
    return unless (done = proc_done.call)

    progress.progress = done < total ? done : total
  end
end
