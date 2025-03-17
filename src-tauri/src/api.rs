use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri_plugin_http::reqwest;


#[derive(Deserialize, Serialize, Default)]
pub struct SessionResponse {
	success: bool,
	session: String
}



#[tauri::command]
pub async fn get_session() -> SessionResponse {

	let client = reqwest::Client::builder().cookie_store(true).connection_verbose(true).build().unwrap();

	let res = client.post("http://dksrv206:35700/icecap/icecap.aspx")
	.form(&json!({}))
	.send().await;

	let mut data = SessionResponse::default();

	if let Ok(response) = res {
		let result = response.json::<SessionResponse>().await;

		if let Ok(session) = result {

			data = session;
		}
	}

	data

}

#[tauri::command]
pub async fn get_data(session: String, data: Value) -> Value {

	let client = reqwest::Client::builder().cookie_store(true).connection_verbose(true).build().unwrap();

	let url = format!("{}/{}/icecap/icecap.aspx?session={}func=&transLationMode=false", "http://dksrv206:35700", session, session);

	let res = client.post(url)
	.form(&data)
	.send()
	.await;

	let mut result = Value::Null;

	if let Ok(response) = res {
		let response = response.json::<Value>().await;

		if let Ok(input) = response {

			result = input
		}
	}

	result
}

#[tauri::command]
pub async fn ping(session: String) {

	let client = reqwest::Client::builder().cookie_store(true).connection_verbose(true).build().unwrap();

	let url = format!("{}/{}/icecap/icecap.aspx?session={}func=&transLationMode=false", "http://dksrv206:35700", session, session);

	let _ = client.post(url).send().await;
}