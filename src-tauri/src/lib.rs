use api::{get_data, get_session, ping};
use tauri::{Manager, WindowEvent};

pub mod api;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
		.setup(|app| {

			let window = app.get_webview_window("main").unwrap();

			window.open_devtools();

			window.on_window_event(|event: &WindowEvent| {
				
				match event {
					WindowEvent::Destroyed => {
						println!("Destroyed");
					},
					_ => {}
				}
			});

			Ok(())

		})
        .plugin(tauri_plugin_shell::init())
		.plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
			get_session,
			get_data,
			ping
		])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
