if File.exist?(File.join('config', 'elasticsearch.yml'))
  config = YAML.load_file(File.join('config', 'elasticsearch.yml'))[Rails.env].symbolize_keys
  Elasticsearch::Model.client = Elasticsearch::Client.new(config)
end
