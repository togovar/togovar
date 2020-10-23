Rails.application.routes.draw do
  get 'suggest', to: 'root#suggest', defaults: { format: 'json' }
  get 'search', to: 'root#search', defaults: { format: 'json' }
end
