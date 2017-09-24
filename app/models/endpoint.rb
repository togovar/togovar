require 'settingslogic'

class Endpoint < Settingslogic
  source Rails.root.join('config', 'endpoint.yml').to_s
  namespace Rails.env
end
