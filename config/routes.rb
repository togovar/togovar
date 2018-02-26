Rails.application.routes.draw do
  root 'root#index'

  get 'suggest', to: 'root#suggest', defaults: { format: 'json' }
  get 'list', to: 'root#list', defaults: { format: 'json' }

  get 'variation', to: 'reports/variation#show'
end
