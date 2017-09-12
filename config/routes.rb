Rails.application.routes.draw do

  root 'static#index'

  resources :gene, only: :show, controller: 'reports/gene', constraints: { id: %r{[\w\-:./]+} }
  resources :clin_var, only: :show, controller: 'reports/clin_var', constraints: { id: %r{\d+} }

end
