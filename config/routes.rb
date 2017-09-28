Rails.application.routes.draw do

  root 'root#index'

  get  'disease/suggest', to: 'root#suggest', defaults: { format: 'json' }

  get  'report_type/gene', to: 'report_type/gene#list', defaults: { format: 'json' }
  get  'report_type/disease', to: 'report_type/disease#list', defaults: { format: 'json' }
  get  'report_type/variation', to: 'report_type/variation#list', defaults: { format: 'json' }

  resources :gene, only: :show, controller: 'reports/gene', constraints: { id: %r{[\w\-:./]+} }
  resources :clin_var, only: :show, controller: 'reports/clin_var', constraints: { id: %r{\d+} }
  resources :exac, only: :show, controller: 'reports/exac', constraints: { id: /.+/ }

end
