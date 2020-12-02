# require 'settingslogic'

class Endpoint # < Settingslogic
  # source Rails.root.join('config', 'endpoint.yml').to_s
  # namespace Rails.env

  def url
    @url ||= begin
      url = RDF::URI(endpoint)
      url.user = user if respond_to?(:user) && user.present?
      url.password = password if respond_to?(:password) && password.present?
      url
    end
  end

  # include Queryable
end
