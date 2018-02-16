# frozen_string_literal: true

source 'https://rubygems.org'

git_source(:github) do |repo_name|
  repo_name = "#{repo_name}/#{repo_name}" unless repo_name.include?('/')
  "https://github.com/#{repo_name}.git"
end

gem 'rails', '~> 5.1.2'

# infrastructure
gem 'elasticsearch-model', github: 'elastic/elasticsearch-rails', branch: '5.x'
gem 'elasticsearch-rails', github: 'elastic/elasticsearch-rails', branch: '5.x'
gem 'mongoid', '~> 6.2'
gem 'puma', '~> 3.7'
gem 'sqlite3'

# javascript & stylesheet
gem 'bootstrap', '~> 4.0.0.beta'
gem 'coffee-rails', '~> 4.2'
gem 'haml-rails', '~> 1.0'
gem 'jbuilder', '~> 2.5'
gem 'jquery-datatables-rails', '~> 3.4'
gem 'jquery-rails', '~> 4.3'
gem 'jquery-ui-rails', '~> 6.0'
gem 'sass-rails', '~> 5.0'

# utility
gem 'action_args', '~> 2.2'
gem 'kaminari', '~> 1.0'
gem 'linkeddata', '~> 3.0'
gem 'ruby-progressbar', '~> 1.9'
gem 'settingslogic', '~> 2.0'

# optimisation
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
  gem 'better_errors', '~> 2.2'
  gem 'listen', '>= 3.0.5', '< 3.2'
  gem 'spring'
  gem 'spring-watcher-listen', '~> 2.0.0'
  gem 'web-console', '>= 3.3.0'
end

group :test do
  gem 'rspec', '~> 3.7'
  gem 'rspec-rails', '~> 3.7'
end

gem 'tzinfo-data', platforms: %i[mingw mswin x64_mingw jruby]
