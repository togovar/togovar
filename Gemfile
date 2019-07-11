source 'https://rubygems.org'

git_source(:github) do |repo_name|
  repo_name = "#{repo_name}/#{repo_name}" unless repo_name.include?('/')
  "https://github.com/#{repo_name}.git"
end

gem 'rails', '~> 5.2', '>= 5.2.2'

# infrastructure
gem 'foreman', '~> 0.84.0'
gem 'puma', '~> 3.7'
gem 'rack-cors', '~> 1.0'
gem 'unicorn', '~> 5.4'

# elasticsearch
gem 'elasticsearch-dsl', '~> 0.1.6'
gem 'elasticsearch-model', '~> 6.0'
gem 'elasticsearch-rails', '~> 6.0'

# redis
gem 'redis-namespace', '~> 1.6'
gem 'redis-rails', '~> 5.0'

# javascript & stylesheet
gem 'coffee-rails', '~> 4.2'
gem 'haml-rails', '~> 1.0'
gem 'jbuilder', '~> 2.5'
gem 'js-routes', '~> 1.4'
gem 'sass-rails', '~> 5.0'
gem 'webpacker', '~> 3.5'

# utility
gem 'action_args', '~> 2.2'
gem 'gtm_rails', '~> 0.5.0'
gem 'kaminari', '~> 1.0'
gem 'linkeddata', '~> 3.0'
gem 'settingslogic', '~> 2.0'
gem 'sidekiq', '~> 5.1'
gem 'sinatra', require: false
# gem 'tzinfo-data', platforms: %i[mingw mswin x64_mingw jruby]

# optimisation
gem 'turbolinks', '~> 5'
gem 'uglifier', '>= 1.3.0'

# development, debug
gem 'pry-rails', '~> 0.3.6'

group :development, :test do
  gem 'byebug', platforms: %i[mri mingw x64_mingw]
  gem 'elasticsearch-extensions', '~> 0.0.31'
  gem 'factory_bot_rails', '~> 4.9'
end

group :development do
  gem 'awesome_print'
  gem 'better_errors', '~> 2.5'
  gem 'better_errors-pry', '~> 1.0'
  gem 'listen', '>= 3.0.5', '< 3.2'
  gem 'spring'
  gem 'spring-watcher-listen', '~> 2.0.0'
  gem 'web-console', '>= 3.3.0'
end

group :test do
  gem 'rspec', '~> 3.7'
  gem 'rspec-rails', '~> 3.7'
end

group :deployment do
  gem 'capistrano', '~> 3.10', require: false
  gem 'capistrano-bundler', '~> 1.3', require: false
  gem 'capistrano-rails', '~> 1.3', require: false
  gem 'capistrano-rbenv', '~> 2.1', require: false
  gem 'capistrano-sidekiq', '~> 1.0', require: false
  gem 'capistrano3-puma', '~> 3.1', require: false
  gem 'capistrano3-unicorn', '~> 0.2.1', require: false
end
