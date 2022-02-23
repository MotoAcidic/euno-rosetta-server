//use: global.debug = require('./debug.js');
module.exports = {

	group: function (content) {
		if (content == undefined) {
			console.log('');
			return;
		}

		console.log(this.hr_top);
		console.log(content);
		console.log(this.hr_bottom);
		console.log('');
	},

	groupEnd: function (content) {
		if (!content == undefined) console.log(content);
		console.log('\n');
		console.groupEnd();
	},

	log: function (content) {
		if (content == undefined) content = '';
		console.log(content);
	},

	hr_top: `¯`.repeat(process.stdout.columns - 2),

	hr_bottom: `_`.repeat(process.stdout.columns - 2)

};
