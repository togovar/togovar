module Configurable
  extend ActiveSupport::Concern

  module ClassMethods
    def load_config(path, key)
      yml = YAML.load_file(path).symbolize_keys

      config = yml[Rails.env.to_sym]
      raise "No such environment #{Rails.env} on #{path}" if config.blank?

      Rails.application.config.send("#{key}=", ActiveSupport::InheritableOptions.new(config.deep_symbolize_keys))
    end
  end
end