source 'https://rubygems.org'
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby '2.7.1'

gem 'rails', '~> 6.0.3', '>= 6.0.3.4'

# infrastructure
gem 'puma', '~> 4.1'
gem 'rack-cors', '~> 1.1', '>= 1.1.1'
gem 'unicorn', '~> 5.7'

# caching
gem 'bootsnap', '>= 1.4.2', require: false

# utility
gem 'awesome_print', '~> 1.8'
gem 'dotenv-rails', '~> 2.7'
gem 'jbuilder', '~> 2.7'
gem 'linkeddata', '~> 3.0'
gem 'settingslogic', '~> 2.0'

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
  gem 'listen', '~> 3.2'
  gem 'spring'
  gem 'spring-watcher-listen', '~> 2.0.0'
  gem 'web-console', '~> 4.0'
end

group :test do
  gem 'rspec', '~> 3.7'
  gem 'rspec-rails', '~> 3.7'
end

group :development, :test do
  gem 'byebug', platforms: %i[mri mingw x64_mingw]
end

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
# gem 'tzinfo-data', platforms: [:mingw, :mswin, :x64_mingw, :jruby]
