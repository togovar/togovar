Rails.application.routes.draw do

  root 'root#index'

  get  'disease/suggest', to: 'root#suggest', defaults: { format: 'json' }

  resources :gene, only: :show, controller: 'reports/gene', constraints: { id: %r{[\w\-:./]+} }
  resources :clin_var, only: :show, controller: 'reports/clin_var', constraints: { id: %r{\d+} }
  resources :exac, only: :show, controller: 'reports/exac', constraints: { id: /.+/ }

end
