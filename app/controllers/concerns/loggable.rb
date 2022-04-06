# frozen_string_literal: true

module Loggable
  extend ActiveSupport::Concern

  def debug(&block)
    logger&.debug(progname, &block)
  end

  def info(&block)
    logger&.info(progname, &block)
  end

  def warn(&block)
    logger&.warn(progname, &block)
  end

  def error(&block)
    logger&.error(progname, &block)
  end

  def fatal(&block)
    logger&.fatal(progname, &block)
  end

  def unknown(&block)
    logger&.unknown(progname, &block)
  end

  private

  def progname
    caller = caller_locations(2, 1)&.first
    caller ? "#{Pathname(caller.absolute_path).relative_path_from(Rails.root)}:#{caller.lineno}" : ''
  end
end
