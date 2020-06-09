if Rails.configuration.respond_to?(:elasticsearch) && (config = Rails.configuration.elasticsearch).present?
  Elasticsearch::Model.client = Elasticsearch::Client.new(config)
end
