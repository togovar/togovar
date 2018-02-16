require 'csv'
require 'tasks/lookup/base/consequence'
require 'tasks/lookup/base/variant_class'
require 'zlib'

module Tasks
  module Lookup
    module Base
      class Importer
        class << self
          attr_accessor :logger

          def import(*args)
            thread = new(*args).start
            puts "Seed #{thread[:done]} items."
          end
        end

        attr_accessor :batch_num

        def initialize(*args)
          options = args.last.is_a?(Hash) ? args.pop : {}

          @file_path = args.first
          @progress  = options.delete(:progress)

          self.batch_num = 1000

          raise("Unknown options: #{options.inspect}") unless options.empty?
        end

        def start
          log("start #{@file_path}", :info)

          thread = task
          if @progress
            thread.join_with_progress
          else
            thread.join
          end

          log("finish #{@file_path}", :info)

          thread
        end

        def log(msg, level = :info)
          if (logger = Importer.logger)
            logger.send(level, msg) if msg
            yield logger if block_given?
          end
        end

        private

        def task
          return @task if @task

          t = method(:total)

          begin
            Thread.abort_on_exception = true

            @task = Thread.new do
              thread = Thread.current

              thread[:done]  = 0
              thread[:total] = t.call if @progress

              records.each_slice(batch_num) do |g|
                ::Lookup::Base.collection.insert_many(g)
                thread[:done] += g.count
              end
            end
          rescue StandardError => e
            log([@file_path, e.message].join(': '), :error)
          end

          class << @task
            def progress
              @progressbar ||= ProgressBar.create(format: '%t|%B| %J%% %a (%E)',
                                                  title:  'Import data ')
            end

            def join_with_progress
              until join(0.5)
                progress.total = self[:total]
                if progress.total.nil?
                  progress.increment
                elsif self[:done]
                  progress.progress = self[:done] < self[:total] ? self[:done] : self[:total]
                else
                  progress.progress = 0
                end
              end
              progress.finish
            end
          end

          @task
        end

        def total
          CSV.row_count(@file_path)
        end

        def reader
          case @file_path
            when /\.gz$/
              Zlib::GzipReader
            else
              File
          end
        end

        def records(&block)
          return to_enum(__method__) unless block_given?

          reader.open(@file_path) do |f|
            @tsv = CSV.new(f, col_sep: "\t", skip_lines: '^#')
            each(&block)
          end
        end

        def each
          if block_given?
            while (record = shift)
              yield record
            end
          else
            to_enum
          end
        end

        def shift
          record     = nil
          current_id = nil

          loop do
            return nil unless @parse ||= @tsv.readline
            break record if current_id && current_id != @parse[0]

            record ||= convert_to_hash(@parse)
            (record[:transcripts] ||= []) << extract_transcript(@parse)

            current_id = @parse[0]
            @parse     = nil
          end
        end

        def convert_to_hash(row)
          loc = row[1].split(':').map(&:to_i)
          {
            tgv_id:             row[0].sub('tgv', '').to_i,
            chromosome:         loc[0],
            position:           loc[1],
            allele:             filter_blank(row[2]),
            gene:               filter_blank(row[3]),
            existing_variation: existing_variation(row[12]),
            symbol:             filter_blank(row[18]),
            sift:               filter_blank(row[21]),
            polyphen:           filter_blank(row[22])
          }
        end

        def filter_blank(str)
          return nil if str.blank? || str == '-'
          str
        end

        def convert_to_int(str)
          return nil unless filter_blank(str)
          begin
            str.to_i
          rescue StandardError => e
            msg = e.message
            msg << " at line #{@tsv.lineno}"
            Importer.logger&.warn(msg)
            raise e
          end
        end

        def existing_variation(str)
          return nil unless filter_blank(str)
          return nil unless str.match?(/^rs/)
          str
        end

        include Consequence
        include VariantClass

        private :consequence
        private :variant_class

        def extract_transcript(row)
          cs = begin
            consequences(row[6])
          rescue StandardError => e
            msg = "unknown consequence: #{row[6]}"
            msg << " at line #{@tsv.lineno}"
            log(msg, :error)
            raise e
          end

          vc = begin
            variant_class(row[17])
          rescue StandardError => e
            msg = "unknown variant class: #{row[17]}"
            msg << " at line #{@tsv.lineno}"
            log(msg, :error)
            raise e
          end

          { consequence:   cs,
            variant_class: vc,
            hgvsc:         filter_blank(row[23]) }
        end
      end
    end
  end
end

class CSV
  def self.row_count(path)
    count = 0
    (path.match?(/\.gz$/) ? Zlib::GzipReader : File).open(path) do |f|
      while (l = f.gets)
        count += 1 unless l.match?(/^#/)
      end
    end
    count
  end
end
