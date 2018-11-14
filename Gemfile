source 'https://rubygems.org'

git_source(:github) do |repo_name|
  repo_name = "#{repo_name}/#{repo_name}" unless repo_name.include?('/')
  "https://github.com/#{repo_name}.git"
end

gem 'rails', '~> 5.2', '>= 5.2.2'

# infrastructure
gem 'elasticsearch-model', github: 'elastic/elasticsearch-rails', branch: '5.x'
gem 'elasticsearch-rails', github: 'elastic/elasticsearch-rails', branch: '5.x'
gem 'foreman', '~> 0.84.0'
gem 'puma', '~> 3.7'
gem 'unicorn', '~> 5.4'

# javascript & stylesheet
gem 'bootstrap', '~> 4.0'
gem 'coffee-rails', '~> 4.2'
gem 'font-awesome-rails', '~> 4.7'
gem 'haml-rails', '~> 1.0'
gem 'jbuilder', '~> 2.5'
gem 'jquery-datatables-rails', '~> 3.4'
gem 'jquery-rails', '~> 4.3'
gem 'jquery-ui-rails', '~> 6.0'
gem 'js-routes', '~> 1.4'
gem 'sass-rails', '~> 5.0'

# utility
gem 'action_args', '~> 2.2'
gem 'kaminari', '~> 1.0'
gem 'linkeddata', '~> 3.0'
gem 'ruby-progressbar', '~> 1.9'
gem 'settingslogic', '~> 2.0'
gem 'sidekiq', '~> 5.1'
gem 'sinatra', require: false
gem 'tzinfo-data', platforms: %i[mingw mswin x64_mingw jruby]

# optimisation
gem 'redis-namespace', '~> 1.6'
gem 'redis-rails', '~> 5.0'
gem 'turbolinks', '~> 5'
gem 'uglifier', '>= 1.3.0'

# development, debug
gem 'pry-rails', '~> 0.3.6'

group :development, :test do
  gem 'byebug', platforms: %i[mri mingw x64_mingw]
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
