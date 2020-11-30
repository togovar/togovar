# frozen_string_literal: true

module TogoVar
  VERSION = '0.9.0'

  module CommonOptions
    SENTENCE_OR_CONNECTORS = { words_connector: "', '",
                               two_words_connector: "' or '",
                               last_word_connector: "', or '" }.freeze
  end

  class Error < StandardError; end
end

require 'togo_var/api'
