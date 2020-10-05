source 'https://rubygems.org'

git_source(:github) do |repo_name|
  repo_name = "#{repo_name}/#{repo_name}" unless repo_name.include?('/')
  "https://github.com/#{repo_name}.git"
end

gem 'rails', '~> 6.0', '>= 6.0.3.3'

# infrastructure
gem 'foreman', '~> 0.87.1'
gem 'puma', '~> 3.7'
gem 'rack-cors', '~> 1.0'
gem 'unicorn', '~> 5.4'
gem 'unicorn-worker-killer', '~> 0.4.4'

# optimisation
gem 'turbolinks', '~> 5' # TODO: purge
gem 'uglifier', '>= 1.3.0'

# frontend
gem 'haml-rails', '~> 1.0'
gem 'jbuilder', '~> 2.5'
gem 'js-routes', '~> 1.4'
gem 'sass-rails', '~> 5.0'
gem 'webpacker', '~> 5.1', '>= 5.1.1'

# utility
gem 'awesome_print', '~> 1.8'
gem 'action_args', '~> 2.2'
gem 'dotenv-rails', '~> 2.7'
gem 'gtm_rails', '~> 0.5.0'
gem 'kaminari', '~> 1.2'
gem 'linkeddata', '~> 3.0'
gem 'settingslogic', '~> 2.0'
# gem 'tzinfo-data', platforms: %i[mingw mswin x64_mingw jruby]

# elasticsearch (need to list after kaminari to enable pagination)
gem 'elasticsearch-dsl', '~> 0.1.9'
gem 'elasticsearch-model', '~> 7.1'
gem 'elasticsearch-rails', '~> 7.1'

# bio science
gem 'bio-vcf', github: 'pjotrp/bioruby-vcf'

# console
gem 'pry-rails', '~> 0.3.6'

group :development do
  gem 'better_errors', '~> 2.5'
  gem 'better_errors-pry', '~> 1.0'
  gem 'capistrano', '~> 3.11', require: false
  gem 'capistrano-bundler', '~> 1.6', require: false
  gem 'capistrano-rails', '~> 1.4', require: false
  gem 'capistrano-rbenv', '~> 2.1', require: false
  gem 'capistrano3-unicorn', '~> 0.2.1', require: false
  gem 'listen', '>= 3.0.5', '< 3.2'
  gem 'spring'
  gem 'spring-watcher-listen', '~> 2.0.0'
  gem 'web-console', '>= 3.3.0'
end

group :test do
  gem 'rspec', '~> 3.7'
  gem 'rspec-rails', '~> 3.7'
  gem 'factory_bot_rails', '~> 4.9'
end

group :development, :test do
  gem 'byebug', platforms: %i[mri mingw x64_mingw]
end
