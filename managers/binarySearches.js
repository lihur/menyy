//Searches that don't actually search data, but show a resulting button that's either the answer or
//open a web-page to something that'll answer the question

const St = imports.gi.St;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Util = imports.misc.util;


const Menyy = imports.misc.extensionUtils.getCurrentExtension();
const constants = Menyy.imports.constants;
const AppType = constants.AppType;




const searchAnswer = new Lang.Class({
	Name: 'searchAnswer',

	_init: function(answer, icon, command, colour) {
		this.colour = colour;
		this.name = answer;
		this.icon = icon ? new Gio.ThemedIcon({ name: icon }) : this.getIcon();
		this.appType = AppType.ANSWER;
		this.command = command;
		
		if (icon == "color-select-symbolic") {
			this.appType = AppType.COLOURANSWER;
		}
	},

	launch: function(timestamp) {
		Util.spawnCommandLine(this.command);
	},

	getIcon: function() {
		return Gio.content_type_get_icon(this.icon);
	}
})



const binarySearches = new Lang.Class({
	Name: 'BinarySearches',

	_init: function() {
		//currenty nothing here
	},

	calculator: function(realInput) {
		this._commandError = false;
		let value = "";
		let input = realInput;
		//if (input.match(/^=([\d\+\-\*\/\(\) \.]+)$/)) {
		if (input.match(/^=([\d\+\-\*\/\(\) \.\\abs\\acos\\asin\\atan\\atan2\\ceil\\cos\\exp\\floor\\log\\max\\min\\pow\\round\\sin\\sqrt\\tan]+)$/)) {
			//Replace x with Math.x where suitable
			input = input.replace("abs", "Math.abs");
			input = input.replace("acos", "Math.acos");
			input = input.replace("asin", "Math.asin");
			input = input.replace("atan", "Math.atan");
			input = input.replace("atan2", "Math.atan2");
			input = input.replace("ceil", "Math.ceil");
			input = input.replace("cos", "Math.cos");
			input = input.replace("exp", "Math.exp");
			input = input.replace("floor", "Math.floor");
			input = input.replace("log", "Math.log");
			input = input.replace("max", "Math.max");
			input = input.replace("min", "Math.min");
			input = input.replace("pow", "Math.pow");
			input = input.replace("round", "Math.round");
			input = input.replace("sin", "Math.sin");
			input = input.replace("sqrt", "Math.sqrt");
			input = input.replace("tan", "Math.tan");
			
			try {
				value = String(eval(input.substr(1)));
			} catch (e) {
				value = "error: " + String(e.message);
			}
			const answer = new searchAnswer (" = " + value, "accessories-calculator-symbolic", "gnome-calculator");
			return answer;
		} else {
			return null;
		}
	},

	colourBook: function(realInput) {
		// Because the code doesn't recognize uppercase
		const input = realInput.toLowerCase();

		var colours = {"aliceblue":"#f0f8ff",
				"antiquewhite":"#faebd7",
				"aqua":"#00ffff",
				"aquamarine":"#7fffd4",
				"azure":"#f0ffff",
				"beige":"#f5f5dc",
				"bisque":"#ffe4c4",
				"black":"#000000",
				"blanchedalmond":"#ffebcd",
				"blue":"#0000ff",
				"blueviolet":"#8a2be2",
				"brown":"#a52a2a",
				"burlywood":"#deb887",
				"cadetblue":"#5f9ea0",
				"chartreuse":"#7fff00",
				"chocolate":"#d2691e",
				"coral":"#ff7f50",
				"cornflowerblue":"#6495ed",
				"cornsilk":"#fff8dc",
				"crimson":"#dc143c",
				"cyan":"#00ffff",
				"darkblue":"#00008b",
				"darkcyan":"#008b8b",
				"darkgoldenrod":"#b8860b",
				"darkgray":"#a9a9a9",
				"darkgreen":"#006400",
				"darkkhaki":"#bdb76b",
				"darkmagenta":"#8b008b",
				"darkolivegreen":"#556b2f",
				"darkorange":"#ff8c00",
				"darkorchid":"#9932cc",
				"darkred":"#8b0000",
				"darksalmon":"#e9967a",
				"darkseagreen":"#8fbc8f",
				"darkslateblue":"#483d8b",
				"darkslategray":"#2f4f4f",
				"darkturquoise":"#00ced1",
				"darkviolet":"#9400d3",
				"deeppink":"#ff1493",
				"deepskyblue":"#00bfff",
				"dimgray":"#696969",
				"dodgerblue":"#1e90ff",
				"firebrick":"#b22222",
				"floralwhite":"#fffaf0",
				"forestgreen":"#228b22",
				"fuchsia":"#ff00ff",
				"gainsboro":"#dcdcdc",
				"ghostwhite":"#f8f8ff",
				"gold":"#ffd700",
				"goldenrod":"#daa520",
				"gray":"#808080",
				"green":"#008000",
				"greenyellow":"#adff2f",
				"honeydew":"#f0fff0",
				"hotpink":"#ff69b4",
				"indianred ":"#cd5c5c",
				"indigo":"#4b0082",
				"ivory":"#fffff0",
				"khaki":"#f0e68c",
				"lavender":"#e6e6fa",
				"lavenderblush":"#fff0f5",
				"lawngreen":"#7cfc00",
				"lemonchiffon":"#fffacd",
				"lightblue":"#add8e6",
				"lightcoral":"#f08080",
				"lightcyan":"#e0ffff",
				"lightgoldenrodyellow":"#fafad2",
				"lightgrey":"#d3d3d3",
				"lightgreen":"#90ee90",
				"lightpink":"#ffb6c1",
				"lightsalmon":"#ffa07a",
				"lightseagreen":"#20b2aa",
				"lightskyblue":"#87cefa",
				"lightslategray":"#778899",
				"lightsteelblue":"#b0c4de",
				"lightyellow":"#ffffe0",
				"lime":"#00ff00",
				"limegreen":"#32cd32",
				"linen":"#faf0e6",
				"magenta":"#ff00ff",
				"maroon":"#800000",
				"mediumaquamarine":"#66cdaa",
				"mediumblue":"#0000cd",
				"mediumorchid":"#ba55d3",
				"mediumpurple":"#9370d8",
				"mediumseagreen":"#3cb371",
				"mediumslateblue":"#7b68ee",
				"mediumspringgreen":"#00fa9a",
				"mediumturquoise":"#48d1cc",
				"mediumvioletred":"#c71585",
				"midnightblue":"#191970",
				"mintcream":"#f5fffa",
				"mistyrose":"#ffe4e1",
				"moccasin":"#ffe4b5",
				"navajowhite":"#ffdead",
				"navy":"#000080",
				"oldlace":"#fdf5e6",
				"olive":"#808000",
				"olivedrab":"#6b8e23",
				"orange":"#ffa500",
				"orangered":"#ff4500",
				"orchid":"#da70d6",
				"palegoldenrod":"#eee8aa",
				"palegreen":"#98fb98",
				"paleturquoise":"#afeeee",
				"palevioletred":"#d87093",
				"papayawhip":"#ffefd5",
				"peachpuff":"#ffdab9",
				"peru":"#cd853f",
				"pink":"#ffc0cb",
				"plum":"#dda0dd",
				"powderblue":"#b0e0e6",
				"purple":"#800080",
				"rebeccapurple":"#663399",
				"red":"#ff0000",
				"rosybrown":"#bc8f8f",
				"royalblue":"#4169e1",
				"saddlebrown":"#8b4513",
				"salmon":"#fa8072",
				"sandybrown":"#f4a460",
				"seagreen":"#2e8b57",
				"seashell":"#fff5ee",
				"sienna":"#a0522d",
				"silver":"#c0c0c0",
				"skyblue":"#87ceeb",
				"slateblue":"#6a5acd",
				"slategray":"#708090",
				"snow":"#fffafa",
				"springgreen":"#00ff7f",
				"steelblue":"#4682b4",
				"tan":"#d2b48c",
				"teal":"#008080",
				"thistle":"#d8bfd8",
				"tomato":"#ff6347",
				"turquoise":"#40e0d0",
				"violet":"#ee82ee",
				"wheat":"#f5deb3",
				"white":"#ffffff",
				"whitesmoke":"#f5f5f5",
				"yellow":"#ffff00",
				"yellowgreen":"#9acd32"};

		let answerHex = "";																						// answer as hex
		let answerName = "";
		let closeness = Infinity ;	
		let distance;
		let hexRed2;
		let hexGreen2;
		let hexBlue2;
		if (input.match(/^#[0-9a-f]{3}$/)) {
			//const hexRed = 5 * parseInt("0x" + input.substr(1,1));												// characters 1 and 2 as int
			//const hexGreen = 5 * parseInt("0x" + input.substr(2,1));											// characters 3 and 4 as int
			//const hexBlue = 5 * parseInt("0x" + input.substr(3,1));												// characters 5 and 6 as int       
			const hexRed = 17 * parseInt("0x" + input.substr(1,1));												// characters 1 and 2 as int
			const hexGreen = 17 * parseInt("0x" + input.substr(2,1));											// characters 3 and 4 as int
			const hexBlue = 17 * parseInt("0x" + input.substr(3,1));												// characters 5 and 6 as int    
			for (var i in colours) {
				hexRed2 = parseInt("0x" + colours[i].substr(1,2));
				hexGreen2 = parseInt("0x" + colours[i].substr(3,2));
				hexBlue2 = parseInt("0x" + colours[i].substr(5,2));

				distance = Math.sqrt( ((hexRed2 - hexRed) * (hexRed2 - hexRed)) + ((hexGreen2 - hexGreen) * (hexGreen2 - hexGreen)) + ((hexBlue2 - hexBlue) * (hexBlue2 - hexBlue)));

				if (distance < closeness) {
					closeness = distance;
					answerHex = colours[i];
					answerName = i;
				}
			}
			
		} else if (input.match(/^#[0-9a-f]{6}$/)) {																// closeness to colour
			const hexRed = parseInt("0x" + input.substr(1,2));													// characters 1 and 2 as int
			const hexGreen = parseInt("0x" + input.substr(3,2));												// characters 3 and 4 as int
			const hexBlue = parseInt("0x" + input.substr(5,2));													// characters 5 and 6 as int      
			for (var i in colours) {
				hexRed2 = parseInt("0x" + colours[i].substr(1,2));
				hexGreen2 = parseInt("0x" + colours[i].substr(3,2));
				hexBlue2 = parseInt("0x" + colours[i].substr(5,2));

				distance = Math.sqrt( ((hexRed2 - hexRed) * (hexRed2 - hexRed)) + ((hexGreen2 - hexGreen) * (hexGreen2 - hexGreen)) + ((hexBlue2 - hexBlue) * (hexBlue2 - hexBlue)));

				if (distance < closeness) {
					closeness = distance;
					answerHex = colours[i];
					answerName = i;
				}
			}
		} else {
			answerName = input;
			answerHex = colours[input];
		}
		
		if (answerHex) {
			const answer = new searchAnswer (answerName + " = " + answerHex, "color-select-symbolic", "gpick", answerHex);
			return answer;
		} else {
			return null;
		}

	}


});