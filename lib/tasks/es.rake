namespace :es do
  namespace :disease do
    desc 'Rebuild disease name index'
    task index: :environment do
      Disease.create_index!
    end
  end

  namespace :gene do
    desc 'Rebuild gene name index'
    task index: :environment do
      Gene.create_index!
    end
  end
end
