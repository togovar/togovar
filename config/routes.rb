Rails.application.routes.draw do

  root 'static#index'

  resources :gene, only: :show, controller: 'reports/gene', constraints: { id: %r{[\w\-:./]+} }

end
