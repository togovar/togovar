worker_processes Integer(ENV['WEB_CONCURRENCY'] || 8)
timeout 60
preload_app true

stderr_path File.expand_path('log/unicorn_stderr.log', ENV['RAILS_ROOT'])
stdout_path File.expand_path('log/unicorn_stdout.log', ENV['RAILS_ROOT'])

pid File.expand_path('tmp/pids/unicorn.pid', ENV['RAILS_ROOT'])
listen File.expand_path('tmp/sockets/unicorn.sock', ENV['RAILS_ROOT'])

before_fork do |server, worker|
  Signal.trap 'TERM' do
    puts 'Unicorn master intercepting TERM and sending myself QUIT instead'
    Process.kill 'QUIT', Process.pid
  end
end

after_fork do |server, worker|
  Signal.trap 'TERM' do
    puts 'Unicorn worker intercepting TERM and doing nothing. Wait for master to send QUIT'
  end
end
