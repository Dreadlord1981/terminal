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

				i_self.renderScreen(o_data, true);

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

		window.addEventListener("resize", function() {

			i_self.onResize(i_self.inputData);
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

	renderScreen(o_inputData, b_resize) {

		var i_self = this;

		var n_prevHeight = i_self.inputData?.height || 24;

		i_self.inputData = o_inputData;

		if (n_prevHeight != o_inputData.height || b_resize) {
			i_self.onResize(o_inputData);
		}

		var i_screen = i_self.screen;

		if (i_screen) {
			
			i_self.clearSreen();

			var a_labels = i_self.createLabels(o_inputData);
			var a_fields = i_self.createFields(o_inputData);
			var a_keys = i_self.createKeys(o_inputData);
			var a_messages = i_self.createMessage(o_inputData);

			i_self.fields = a_fields;

			i_screen.append(...a_labels);
			i_screen.append(...a_fields);
			i_screen.append(...a_keys);
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

		var a_inputs = Array.prototype.slice.apply(o_inputData.input || []);

		var a_fields = [];
		var n_plus = 0;

		a_inputs.forEach(function(o_config, n_index) {

			var i_element = document.createElement("input");

			let n_left = i_self.handler.getX(o_config.col - 1);
			let n_top = i_self.handler.getY(o_config.lin - 1) + (n_plus * o_config.lin);
			let n_width = i_self.handler.getWidth() * o_config.len;

			if (n_width > i_self.handler.getScreenWidth()) {
				n_width = (n_width - n_left) - i_self.handler.getScreenWidth();

				let n_row = Math.floor(o_config.len / (o_inputData.width - o_config.col));

				n_width = (o_inputData.width - o_config.col) * i_self.handler.getWidth();

				i_element = document.createElement("textarea");
				i_element.classList.add("continuous");
				i_element.setAttribute("rows", n_row);
				i_element.setAttribute("cols", o_inputData.width - o_config.col);
			}
			else {
				i_element.classList.add("field");
			}

			if (o_config.atr) {
				i_element.classList.add("input-" + o_config.atr);
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

		var a_outputs = Array.prototype.slice.apply(o_inputData.output || []);
		var n_plus = 0;

		a_outputs.forEach(function(o_config) {

			var i_element = document.createElement("SPAN");

			let n_left = i_self.handler.getX(o_config.col -1);
			let n_top = i_self.handler.getY(o_config.lin - 1) + (n_plus * o_config.lin);

			i_element.innerHTML = o_config.dta;
			i_element.style.left = n_left + "px";
			i_element.style.top = n_top + "px";
			i_element.style.position = "absolute";
			i_element.classList.add("label");

			if (o_config.atr) {
				i_element.classList.add("output-" + o_config.atr);
			}

			a_labels.push(i_element);
		});

		return a_labels;
	}

	createKeys(o_inputData) {


		var i_self = this;
		var a_return = [];

		var a_keys = Array.prototype.slice.apply(o_inputData.keys || []);
		var n_plus = 0;

		a_keys.forEach(function(o_config) {

			var i_element = document.createElement("SPAN");

			let n_left = i_self.handler.getX(o_config.col -1);
			let n_top = i_self.handler.getY(o_config.lin - 1) + (n_plus * o_config.lin);

			i_element.innerHTML = o_config.id + "=" + o_config.text || "";
			i_element.style.left = n_left + "px";
			i_element.style.top = n_top + "px";
			i_element.style.position = "absolute";
			i_element.classList.add("keys");

			i_element.classList.add("output-3A");

			a_return.push(i_element);
		});

		return a_return;
	}

	createMessage(o_inputData) {


		var i_self = this;
		var a_return = [];

		var a_messages = Array.prototype.slice.apply(o_inputData.message || []);

		var o_message = a_messages[0];

		if (o_message) {
			var i_element = document.createElement("SPAN");

			let n_left = i_self.handler.getX(1);
			let n_top = i_self.handler.getY((o_inputData.height -1));

			i_element.innerHTML = o_message.text || "";
			i_element.style.left = n_left + "px";
			i_element.style.top = n_top + "px";
			i_element.style.position = "absolute";
			i_element.classList.add("message");

			a_return.push(i_element);
		}


		return a_return;
	}

	handleInputEvent(i_event) {

		var i_self = this;

		var s_key = i_self.handler.getKey(i_event.keyCode);

		if (s_key) {

			s_key = s_key.toUpperCase();

			if (i_event.shiftKey == true) {

				s_key = i_self.handler.getModifiedKey(s_key);
			}

			var i_result = i_self.getData(s_key);

			i_result.then(function(o_data) {

				i_self.renderScreen(o_data);
			});

			i_event.preventDefault();
			i_event.stopPropagation();
			i_event.cancelBubble = true;
		}
		else if (i_event.key.toUpperCase() == "TAB") {

			i_event.preventDefault();
			i_event.stopPropagation();
			i_event.cancelBubble = true;

			var i_field = i_event.target;
			
			var n_index = parseInt(i_field.attributes.getNamedItem("name").value.split("i").pop());

			n_index = n_index + (i_event.shiftKey ? -1 : 1);

			var a_fields = document.getElementsByName("i" + n_index);

			if (a_fields.length > 0) { 
				a_fields[0].focus({
					focusVisible: true
				});
			}
			else {
				var a_inputs = document.getElementsByTagName("input");
				var a_textareas = document.getElementsByTagName("textarea");

				var a_fields = Array.prototype.slice.apply(a_inputs, [0]).concat(Array.prototype.slice.apply(a_textareas, [0]));

				a_fields = a_fields.sort(function(a, b) {

					let n_first = parseInt(a.attributes.getNamedItem("name").value.split("i").pop());
					let n_second = parseInt(b.attributes.getNamedItem("name").value.split("i").pop());
					return n_first - n_second;
				});

				let n_next = (i_event.shiftKey ? a_fields.length - 1 : 0);

				if (a_fields.length > 0) { 
					a_fields[n_next].focus({
						focusVisible: true
					});
				}
			}
		}
		else if (i_self.handler.isArrowKey(i_event.keyCode)) {

			let i_cursor = i_self.cursor;

			let n_col = i_self.col;
			let n_lin = i_self.lin;
			let n_width = i_self.handler.getWidth();

			var a_fields = i_self.getInputs();

			let i_current = i_event.target;

			var n_curpos = i_current.selectionDirection == "forward" ? i_current.selectionEnd : i_current.selectionStart;
			var n_maxLength = parseInt(i_current.attributes.getNamedItem("maxlength").value);

			var n_currentCol = parseInt(i_current.attributes.getNamedItem("col").value);
			var n_currentLin = parseInt(i_current.attributes.getNamedItem("lin").value);

			let a_filtered = a_fields.filter(function(i_field) {
				
				let n_fieldCol = parseInt(i_field.attributes.getNamedItem("col").value);
				let n_fieldLin = parseInt(i_field.attributes.getNamedItem("lin").value);

				return n_fieldCol == n_currentCol;
			});

			if (i_event.keyCode == 40 ||
				i_event.keyCode == 38
			) {
				a_filtered = a_fields.filter(function(i_field) {
					
					let n_fieldCol = parseInt(i_field.attributes.getNamedItem("col").value);

					return n_fieldCol == n_currentCol;
				});
			}
			else {
				a_filtered = a_fields.filter(function(i_field) {
					
					let n_fieldLin = parseInt(i_field.attributes.getNamedItem("lin").value);

					return n_fieldLin == n_currentLin;
				});

				a_filtered = i_event.keyCode == 37 ? a_filtered.reverse() : a_filtered;
			}

			for (let n_index = 0; n_index < a_filtered.length; n_index++) {
				
				let i_field = a_filtered[n_index];

				let n_fieldLin = parseInt(i_field.attributes.getNamedItem("lin").value);
				let n_fieldCol = parseInt(i_field.attributes.getNamedItem("col").value);

				// DOWN / UP
				if (i_event.keyCode == 40 ||
					i_event.keyCode == 38
				) {
					let n_next = i_event.keyCode == 40 ? 1 : -1;

					if (n_fieldLin == n_currentLin + n_next) {
						
						i_field.focus({
							focusVisible: true
						});

						i_event.preventDefault();
						i_event.stopPropagation();
						i_event.cancelBubble = true;
						
						break;
					}
				}
				else {

					if (a_filtered.length > 1) {

						if (i_event.keyCode == 39 && n_fieldCol > n_currentCol) {
							
							if (i_current.value.length == n_curpos) {

								i_field.focus({
									focusVisible: true
								});
							}

							break;
						}
						else if (i_event.keyCode == 37 && n_fieldCol < n_currentCol) {
							
							if (n_curpos == 0) {

								i_field.focus({
									focusVisible: true
								});
							}

							break;
						}
					}
				}
			}
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

		var n_col = n_col + n_curpos;

		var n_x = i_self.handler.getX(n_col);

		var i_cursor = i_self.cursor;

		if (i_cursor) {
			i_cursor.style.setProperty("left", n_x + "px");
		}

		i_self.col = n_col;
	}

	handleScreenKeyEvent(i_event) {

		var i_self = this;

		var s_key = i_self.handler.getKey(i_event.keyCode);

		if (s_key) {

			s_key = s_key.toUpperCase();

			if (i_event.shiftKey == true) {

				s_key = i_self.handler.getModifiedKey(s_key);
			}

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
			i_cursor.style.setProperty("display", "none");
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
			i_cursor.style.setProperty("display", "block");
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

	getInputs() {

		var i_self = this;

		return i_self.fields;
	}

	ping() {

		var i_self = this;

		return invoke("ping", {session: i_self.session});
	}

	onResize() {

		var i_self = this;
		var i_screen = i_self.screen;
		var i_handler = i_self.handler;
		var o_config = i_handler.config;
		var o_rect = i_screen.getBoundingClientRect();
		var i_fieldCss = i_handler.getFieldCss();
		var i_labelCss = i_handler.getLabelCss();
		var i_textAreaCss = i_handler.getTextAreaCss();
		var i_bodyCss = i_handler.getBodyCss();
		var i_messageCss = i_handler.getMessageCss();

		var o_inputData = i_self.inputData;
		var n_col_width = 16;
		var n_lin_height = 24;
		
		var n_screenWidth = o_inputData.width * n_col_width;
		var n_screenHeight = o_inputData.height * n_lin_height;

		var n_colScale = o_config.colScale;
		var n_linScale = o_config.linScale;

		n_colScale = o_rect.width / n_screenWidth;

		n_linScale = o_rect.height / n_screenHeight;

		o_config.colScale = n_colScale;
		o_config.linScale = n_linScale;

		i_fieldCss.style.lineHeight = (n_lin_height * n_linScale) + "px";
		i_fieldCss.style.fontSize = (n_col_width * n_colScale) + "px";

		i_labelCss.style.lineHeight = (n_lin_height * n_linScale) + "px";
		i_labelCss.style.fontSize = (n_col_width * n_colScale) + "px";

		i_textAreaCss.style.lineHeight = (n_lin_height * n_linScale) + "px";
		i_textAreaCss.style.fontSize = (n_col_width * n_colScale) + "px";

		i_bodyCss.style.lineHeight = (n_lin_height * n_linScale) + "px";
		i_bodyCss.style.fontSize = (n_col_width * n_colScale) + "px";

		i_messageCss.style.lineHeight = (n_lin_height * n_linScale) + "px";
		i_messageCss.style.fontSize = (n_col_width * n_colScale) + "px";

		i_self.renderScreen(o_inputData);

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

		i_self.getFieldCss();
		i_self.getLabelCss();
		i_self.getTextAreaCss();
		
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

	getModifiedKey(s_key) {

		var s_return = s_key;

		switch (s_key) {
			case "F1":
				s_return = "F13";
				break;
			case "F2":
				s_return = "F14";
				break;
			case "F3":
				s_return = "F15";
				break;
			case "F4":
				s_return = "F16";
				break;
			case "F5":
				s_return = "F17";
				break;
			case "F6":
				s_return = "F18";
				break;
			case "F7":
				s_return = "F19";
				break;
			case "F8":
				s_return = "F20";
				break;
			case "F9":
				s_return = "F21";
				break;
			case "F10":
				s_return = "F22";
				break;
			case "F11":
				s_return = "F23";
				break;
			case "F12":
				s_return = "F24";
				break;
		};
		
		return s_return;
	}

	isArrowKey(n_code) {

		return [37, 38, 39, 40].indexOf(n_code) > -1;
	}

	getFieldCss() {

		var i_self = this;

		var i_result = i_self.fieldCssRule;
		
		var a_css = Array.prototype.slice.apply(document.styleSheets || []);

		a_css.forEach(function(i_css) {

			for (let i = 0; i < i_css.cssRules.length; i++) {
				
				let i_rule = i_css.cssRules[i];
				
				if (i_rule.selectorText && i_rule.selectorText.indexOf("field") > -1) {
					i_result = i_rule;
					i_self.fieldCssRule = i_result;
				}
			}
		});

		return i_result;
	}

	getLabelCss() {

		var i_self = this;

		var i_result = i_self.labelCssRule;
		
		var a_css = Array.prototype.slice.apply(document.styleSheets || []);

		a_css.forEach(function(i_css) {

			for (let i = 0; i < i_css.cssRules.length; i++) {
				
				let i_rule = i_css.cssRules[i];
				
				if (i_rule.selectorText && i_rule.selectorText.indexOf("label") > -1) {
					i_result = i_rule;
					i_self.labelCssRule = i_result;
				}
			}
		});

		return i_result;
	}

	getTextAreaCss() {

		var i_self = this;

		var i_result = i_self.textAreaRule;
		
		var a_css = Array.prototype.slice.apply(document.styleSheets || []);

		a_css.forEach(function(i_css) {

			for (let i = 0; i < i_css.cssRules.length; i++) {
				
				let i_rule = i_css.cssRules[i];
				
				if (i_rule.selectorText && i_rule.selectorText.indexOf("continuous") > -1) {
					i_result = i_rule;
					i_self.textAreaRule = i_result;
				}
			}
		});

		return i_result;
	}

	getBodyCss() {

		var i_self = this;

		var i_result = i_self.bodyCssRule;
		
		var a_css = Array.prototype.slice.apply(document.styleSheets || []);

		a_css.forEach(function(i_css) {

			for (let i = 0; i < i_css.cssRules.length; i++) {
				
				let i_rule = i_css.cssRules[i];
				
				if (i_rule.selectorText && i_rule.selectorText.indexOf("body") > -1) {
					i_result = i_rule;
					i_self.bodyCssRule = i_result;
				}
			}
		});

		return i_result;
	}

	getMessageCss() {

		var i_self = this;

		var i_result = i_self.messageCssRule;
		
		var a_css = Array.prototype.slice.apply(document.styleSheets || []);

		a_css.forEach(function(i_css) {

			for (let i = 0; i < i_css.cssRules.length; i++) {
				
				let i_rule = i_css.cssRules[i];
				
				if (i_rule.selectorText && i_rule.selectorText.indexOf("message") > -1) {
					i_result = i_rule;
					i_self.messageCssRule = i_result;
				}
			}
		});

		return i_result;
	}
}

document.addEventListener("DOMContentLoaded", function() {

	let terminal = new Terminal();

	window.terminal = terminal;
});