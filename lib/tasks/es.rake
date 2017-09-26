namespace :es do
  desc "Update index"
  task index: :environment do
    Disease.update_index!
  end
end
