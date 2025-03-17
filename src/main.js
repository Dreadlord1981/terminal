const { invoke } = window.__TAURI__.core;

class Terminal {

	constructor() {

		var i_self = this;
	
		Object.apply(i_self, {
			col: 1,
			lin: 1
		});
		

		var i_promise = i_self.init();

		i_promise.then(function(o_response) {

			i_self.session = o_response.session;

			var i_result = i_self.getData();

			i_result.then(function(o_data) {

				i_self.renderScreen(o_data);

				i_self.createHeartBeat();
			});
		})
	}

	init() {

		var i_self = this;

		var i_handler = new Handler();
		var i_screen = document.getElementById("screen");

		Object.assign(i_self, {
			screen: i_screen,
			handler: i_handler,
			fields: []
		});
		
		i_self.handleInputEvent.bind(i_self);

		document.addEventListener("keydown", i_self.handleScreenKeyEvent.bind(i_self));
		document.addEventListener("click", i_self.handleClick.bind(i_self));

		var i_promise = new Promise(function(f_resolve, f_reject) {

			fetch("http://dksrv206:35700/icecap/icecap.aspx", {
				method: "POST"
			}).then(function(i_fetch) {

				f_resolve(i_fetch.json());
			});
		});

		return i_promise;
	}

	getData(s_key) {

		var i_self = this;

		var s_session = i_self.session;

		var a_fields = Array.prototype.slice.apply(i_self.fields, [0]);

		var o_data = {};

		if (["ROLLUP", "ROLLDOWN"].indexOf(s_key) == -1) {
			a_fields.forEach(function(i_field) {
				o_data["ses2.win." + i_field.name] = i_field.value;
			});
		}

		if (s_key) {

			Object.assign(o_data, {
				key: s_key
			});
		}

		Object.assign(o_data, {
			csrCol: i_self.col,
			csrLin: i_self.lin
		});

		var i_promise = new Promise(function(f_resolve, f_reject) {

			let formData = new FormData();
			
			Object.keys(o_data).forEach(function(s_key) {
				formData.append(s_key, o_data[s_key]);
			});

			fetch("http://dksrv206:35700/" + s_session + "/icecap/icecap.aspx?func=&session=" +s_session + "&transLationMode=false", {
				method: "POST",
				body: formData
			}).then(function(i_fetch) {

				f_resolve(i_fetch.json());
			});
		});

		return i_promise;
	}

	renderScreen(o_inputData) {

		var i_self = this;

		var i_screen = i_self.screen;

		if (i_screen) {
			
			i_self.clearSreen();

			var a_labels = i_self.createLabels(o_inputData);
			var a_fields = i_self.createFields(o_inputData);
			var a_messages = i_self.createMessage(o_inputData);

			i_self.fields = a_fields;

			i_screen.append(...a_labels);
			i_screen.append(...a_fields);
			i_screen.append(...a_messages);
			
			i_screen.append(i_self.createCursor(o_inputData));

			if (o_inputData.focus > 0 ) {

				var i_focus = i_self.fields[o_inputData.focus -1];

				if (i_focus) {
					i_focus.focus({
						focusVisible: true
					});
				}
			}
		}
	}

	createCursor(o_inputData) {

		var i_self = this;
		var i_cursor = i_self.cursor;

		if (!i_cursor) {

			var i_element = document.createElement("SPAN");

			let n_left = i_self.handler.getX(o_inputData.csrCol);
			let n_top = i_self.handler.getY(o_inputData.csrLin);

			i_element.style.left = n_left + "px";
			i_element.style.top = n_top + "px";
			i_element.style.position = "absolute";
			i_element.classList.add("cursor");

			var n_width = i_self.handler.getWidth();

			i_element.style.setProperty("min-width", n_width + "px");
			i_element.style.setProperty("max-width", n_width  + "px");
			i_element.style.setProperty("width", n_width  + "px");

			i_self.cursor = i_cursor  = i_element;
		}

		return i_cursor;
	}

	clearSreen() {

		var i_self = this;
		
		var i_screen = i_self.screen;

		var a_fields = i_self.fields;

		a_fields.forEach(function(i_field) {

			i_field.removeEventListener("keydown", i_self.handleInputEvent.bind(i_self));
		});

		i_screen.innerHTML = "";

		i_self.cursor = null;
	}

	createFields(o_inputData) {

		var i_self = this;

		var a_outputs = o_inputData.input;

		var a_fields = [];
		var n_plus = 0;

		a_outputs.forEach(function(o_config, n_index) {

			var i_element = document.createElement("input");

			let n_left = i_self.handler.getX(o_config.col - 1);
			let n_top = i_self.handler.getY(o_config.lin - 1) + (n_plus * o_config.lin);
			let n_width = i_self.handler.getWidth() * o_config.len;

			if (n_width > i_self.handler.getScreenWidth()) {
				n_width = i_self.handler.getScreenWidth();
			}

			i_element.value = o_config.dta || "";
			i_element.style.left = n_left + "px";
			i_element.style.top = n_top + "px";
			i_element.style.position = "absolute";

			i_element.style.setProperty("min-width", n_width + "px");
			i_element.style.setProperty("max-width", n_width  + "px");
			i_element.style.setProperty("width", n_width  + "px");

			i_element.setAttribute("name", o_config.id);
			i_element.setAttribute("autocomplete", "off");
			i_element.setAttribute("lin", o_config.lin);
			i_element.setAttribute("col", o_config.col);
			i_element.setAttribute("maxlength", o_config.len);
			i_element.setAttribute("index", n_index);

			i_element.addEventListener("keydown", i_self.handleInputEvent.bind(i_self));
			i_element.addEventListener("input", i_self.inputChange.bind(i_self));
			i_element.addEventListener("selectionchange", i_self.inputChange.bind(i_self));
			i_element.addEventListener("focus", i_self.handleFieldFocus.bind(i_self));

			a_fields.push(i_element);
		});

		return a_fields;
		
	}

	createLabels(o_inputData) {


		var i_self = this;
		var a_labels = [];

		var a_outputs = o_inputData.output;
		var n_plus = 0;

		a_outputs.forEach(function(o_config) {

			var i_element = document.createElement("SPAN");

			let n_left = i_self.handler.getX(o_config.col -1);
			let n_top = i_self.handler.getY(o_config.lin - 1) + (n_plus * o_config.lin);

			i_element.innerHTML = o_config.dta;
			i_element.style.left = n_left + "px";
			i_element.style.top = n_top + "px";
			i_element.style.position = "absolute";

			if (o_config.atr) {
				i_element.classList.add("output-" + o_config.atr);
			}

			a_labels.push(i_element);
		});

		return a_labels;
	}

	createMessage(o_inputData) {


		var i_self = this;
		var a_return = [];

		var a_messages = Array.prototype.slice(o_inputData.message || []);

		var o_message = a_messages[0];

		if (o_message) {
			var i_element = document.createElement("SPAN");

			let n_left = i_self.handler.getX(1);
			let n_top = i_self.handler.getY(o_inputData.errLin);

			i_element.innerHTML = o_message.text || "";
			i_element.style.left = n_left + "px";
			i_element.style.top = n_top + "px";
			i_element.style.position = "absolute";

			a_return.push(i_element);
		}


		return a_return;
	}

	handleInputEvent(i_event) {

		var i_self = this;

		var s_key = i_self.handler.getKey(i_event.keyCode);

		if (s_key) {

			s_key = s_key.toUpperCase();

			var i_result = i_self.getData(s_key);

			i_result.then(function(o_data) {

				i_self.renderScreen(o_data);
			});

			i_event.preventDefault();
			i_event.stopPropagation();
			i_event.cancelBubble = true;
		}
	}

	inputChange(i_event) {

		var i_self = this;

		var i_field = i_event.target;

		var n_index = parseInt(i_field.attributes.getNamedItem("index").value);
		var n_maxLength = parseInt(i_field.attributes.getNamedItem("maxlength").value);

		var n_col = parseInt(i_field.attributes.getNamedItem("col").value -1);

		var n_next = n_index + 1;

		var n_curpos = i_field.selectionDirection == "forward" ? i_field.selectionEnd : i_field.selectionStart;

		if (i_field.value.length == n_maxLength) {

			if (n_next < i_self.fields.length) {

				var i_next = i_self.fields[n_next];

				if (i_next) {
					i_next.focus({
						focusVisible: true
					});
				}
			}
		}
		else if (i_self.handler.isArrowKey(i_event.keyCode)) {

			i_event.stopPropagation();
		}

		i_self.col = n_col + n_curpos;
	}

	handleScreenKeyEvent(i_event) {

		var i_self = this;

		var s_key = i_self.handler.getKey(i_event.keyCode);

		if (s_key) {

			s_key = s_key.toUpperCase();

			var i_result = i_self.getData(s_key);

			i_result.then(function(o_data) {

				i_self.renderScreen(o_data);
			});

			i_event.preventDefault();
			i_event.stopPropagation();
			i_event.cancelBubble = true;
		}
		else if (i_self.handler.isArrowKey(i_event.keyCode)) {

			i_self.moveCursor(i_event.keyCode);
		}
	}

	handleFieldFocus(i_event) {

		var i_self = this;
		var i_field = i_event.target;

		var n_col = parseInt(i_field.attributes.getNamedItem("col").value -1);
		var n_lin = parseInt(i_field.attributes.getNamedItem("lin").value);

		i_self.lin = n_lin;
		i_self.col = n_col;

		var n_x = i_self.handler.getX(n_col);
		var n_y = i_self.handler.getY(n_lin);

		var i_cursor = i_self.cursor;

		if (i_cursor) {
			i_cursor.style.setProperty("left", n_x + "px");
			i_cursor.style.setProperty("top", n_y + "px");
		}
	}

	handleClick(i_event) {

		var i_self = this;

		var i_screen = i_self.screen;

		var o_rect = i_screen.getBoundingClientRect()

		var n_col = i_self.handler.getCol(i_event.x - o_rect.x);
		var n_lin = i_self.handler.getLin(i_event.y - o_rect.y);

		var n_x = i_self.handler.getX(n_col);
		var n_y = i_self.handler.getY(n_lin);

		var i_cursor = i_self.cursor;

		if (i_cursor) {
			i_cursor.style.setProperty("left", n_x + "px");
			i_cursor.style.setProperty("top", n_y + "px");
		}

		i_self.lin = n_lin;
		i_self.col = n_col;
	}

	moveCursor(n_keyCode) {

		var i_self = this;

		var n_col = i_self.col;
		var n_lin = i_self.lin;

		switch (n_keyCode) {
			// LEFT
			case 37:
				n_col -=1;
				break;
			// UP
			case 38:
				n_lin -=1;
				break;
			//RIGHT
			case 39:
				n_col +=1;
				break;
			//DOWN
			case 40:
				n_lin +=1;
				break;
		}

		var n_x = i_self.handler.getX(n_col);
		var n_y = i_self.handler.getY(n_lin);

		var i_cursor = i_self.cursor;

		if (i_cursor) {
			i_cursor.style.setProperty("left", n_x + "px");
			i_cursor.style.setProperty("top", n_y + "px");
		}

		i_self.lin = n_lin;
		i_self.col = n_col;

	}

	createHeartBeat() {

		var i_self = this;

		var n_timer = i_self.timer;

		if (n_timer) {
			clearTimeout(n_timer)
		}

		n_timer = setTimeout(function() {
			var i_promise = i_self.ping();

			i_promise.then(function() {
				i_self.createHeartBeat();
			})
		}, 10000);

		i_self.timer = n_timer;
	}

	ping() {

		var i_self = this;

		return invoke("ping", {session: i_self.session});
	}
}

class Handler {

	constructor() {
		
		var i_self = this;
		i_self.init();
	}

	init() {

		var i_self = this;

		var i_element = document.createElement("span");

		i_element.style.left = "-99999px";
		i_element.style.top = "-99999px"
		i_element.style.position = "absolute";

		var s_value = String("").padStart(100_000, "W");

		i_element.innerText = s_value;

		document.body.appendChild(i_element);

		var n_width = i_element.offsetWidth /  100_000;
		var n_height = i_element.offsetHeight;

		document.body.removeChild(i_element);

		var o_config = {
			screen: {
				width: 80 * n_width,
				height: 24 * n_height
			},
			colWidth: n_width,
			linHeight: n_height,
			colScale: 1,
			linScale: 1
		};

		i_self.config = o_config;

		var o_keys = {
			13: "ENTER",
			27: "ESC",
			33: "ROLLDOWN",
			34: "ROllUP",
			123: "F12",
			122: "F11",
			121: "F10",
			120: "F9",
			119: "F8",
			118: "F7",
			117: "F6",
			116: "F5",
			115: "F4",
			114: "F3",
			113: "F2",
			112: "F1"
		};

		i_self.keyCodes = o_keys;
	}

	getX(n_col) {

		var i_self = this;
		var o_config = i_self.config;

		return n_col * o_config.colWidth * o_config.colScale ;
	}
	
	getY(n_lin) {

		var i_self = this;
		var o_config = i_self.config;

		return n_lin * o_config.linHeight * o_config.linScale ;
	}

	getCol(n_x) {

		var i_self = this;
		var o_config = i_self.config;

		return Math.round(n_x / (o_config.colWidth * o_config.colScale));
	}

	getLin(n_y) {

		var i_self = this;
		var o_config = i_self.config;

		return Math.round(n_y / (o_config.linHeight * o_config.linScale));
	}

	getWidth() {
		
		var i_self = this;
		var o_config = i_self.config;

		return o_config.colWidth * o_config.colScale;
	}

	getHeight() {
		
		var i_self = this;
		var o_config = i_self.config;

		return o_config.linHeight * o_config.linScale;
	}

	getScreenWidth() {
		
		var i_self = this;
		var o_config = i_self.config;
		var o_screen = i_self.config.screen;

		return o_screen.width * o_config.colScale;
	}

	getScreenHeight() {
		
		var i_self = this;
		var o_config = i_self.config;
		var o_screen = i_self.config.screen;

		return o_screen.height * o_config.linScale;
	}

	getKey(n_code) {
		
		var i_self = this;

		return i_self.keyCodes[n_code];
	}

	isArrowKey(n_code) {

		return [37, 38, 39, 40].indexOf(n_code) > -1;
	}
}

document.addEventListener("DOMContentLoaded", function() {

	let terminal = new Terminal();

	window.terminal = terminal;
});