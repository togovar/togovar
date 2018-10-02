module StaticHelper
  def download_path(file_name)
    # TODO: generate file location dynamically based on latest release
    path = ['public', 'release', '20180601', file_name].join('/')
    Rails.application.routes.url_helpers.root_path + path
  end
end
