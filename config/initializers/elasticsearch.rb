if Rails.application.config.respond_to?(:elasticsearch) && (config = Rails.application.config.elasticsearch).present?
  Elasticsearch::Model.client = Elasticsearch::Client.new(config)
end
