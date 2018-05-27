require 'sidekiq/web'

Rails.application.routes.draw do
  root 'root#index'

  get 'search', to: 'root#index'

  # static pages
  get 'doc/about', to: 'static#about'
  get 'doc/contact', to: 'static#contact'
  get 'doc/datasets', to: 'static#datasets'
  get 'doc/datasets/jga_ngs', to: 'static#jga_ngs'
  get 'doc/datasets/jga_snp', to: 'static#jga_snp'
  get 'doc/datasets/analysis', to: 'static#analysis'
  get 'doc/help', to: 'static#help'
  get 'doc/policy', to: 'static#policy'
  get 'doc/terms', to: 'static#terms'

  # variation report
  get 'variation/:id', to: 'reports/variation#show', constraints: { id: /\d+/ }

  # gene report
  get 'gene/:id', to: 'reports/gene#show', constraints: { id: %r{[\w\-:.\/]+} }

  # api
  get 'suggest', to: 'root#suggest', defaults: { format: 'json' }
  match 'list', to: 'root#list', defaults: { format: 'json' }, via: [:get,:post]
end
