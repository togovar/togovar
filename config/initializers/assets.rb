# Be sure to restart your server when you modify this file.

# Version of your assets, change this if you want to expire all your assets.
Rails.application.config.assets.version = '1.0'

# Add additional assets to the asset load path.
# Rails.application.config.assets.paths << Emoji.images_path
# Add Yarn node_modules folder to the asset load path.
Rails.application.config.assets.paths << Rails.root.join('node_modules')

# Precompile additional assets.
# application.js, application.scss, and all non-JS/CSS in the app/assets
# folder are already added.
Rails.application.config.assets.precompile += %w[bootstrap-combobox.css bootstrap-combobox.js]
Rails.application.config.assets.precompile << proc do |path|
  if path =~ /\.(css|js)\z/
    full_path = Rails.application.assets.resolve(path)
    app_assets_path = Rails.root.join('app', 'assets').to_path
    if full_path =~ /^#{app_assets_path}/
      Rails.logger.debug "  Included asset: #{full_path}"
      true
    else
      Rails.logger.debug "  Excluded asset: #{full_path}"
      false
    end
  else
    false
  end
end
