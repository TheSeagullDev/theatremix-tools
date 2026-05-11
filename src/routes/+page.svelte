<script>
	import { getSQL } from '$lib/sqlite';
	import { RowComponent } from 'tabulator-tables';
	import Table from '../components/table.svelte';

	let db;
	let table = $state();

	const testProfiles = [
		{ channel: 1, name: 'Person 1' },
		{ channel: 2, name: 'Person 2' },
		{ channel: 4, name: 'Person 3' },
		{ channel: 5, name: 'Person 4' },
		{ channel: 8, name: 'Person 5' }
	];

	async function loadTemplate(name) {
		const response = await fetch(`/templates/${name}.tmix`);

		const buffer = await response.arrayBuffer();

		const SQL = await getSQL();

		db = new SQL.Database(new Uint8Array(buffer));
		db.run("DELETE FROM sqlite_sequence WHERE name = 'profiles';");
		console.log('Loaded DB:', db);
	}

	function downloadDB() {
		const data = db.export();

		const blob = new Blob([data]);

		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'new-show.tmix';
		a.click();

		URL.revokeObjectURL(url);
	}

	function query(db, sql, params = []) {
		const stmt = db.prepare(sql);
		stmt.bind(params);

		const rows = [];

		while (stmt.step()) {
			rows.push(stmt.getAsObject());
		}

		stmt.free();

		return rows;
	}

	function insertArray(db, table, data) {
		const stmt = db.prepare(
			`INSERT INTO ${table} (channel, name, "default", data) VALUES (?, ?, 1, "")`
		);

		for (const row of data) {
			stmt.run([row.channel, row.name]);
		}

		stmt.free();
	}

	function updateConfig(db, param, value) {
		db.run(`UPDATE config SET value = (?) WHERE param = (?)`, [value, param]);
	}
</script>

<button onclick={() => loadTemplate('x32')}> Load X32 Template </button>
<button
	onclick={() => {
		const data = table.getData();
		const filteredData = data.map((row) => ({
			channel: row.channel,
			name: row.name.replace('\r', '')
		}));
		console.log(filteredData);
		insertArray(db, 'profiles', filteredData);
		const channels = filteredData.map((row) => row.channel);
		updateConfig(db, 'channels', channels.join());
		console.log(query(db, 'SELECT * FROM profiles;'));
		console.log(query(db, 'SELECT * FROM config;'));
	}}
>
	Insert CSV data
</button>
<button onclick={downloadDB}>Download DB</button>

<Table
	bind:table
	data={[{ channel: '', name: '' }]}
	columns={[
		{ title: 'Channel', field: 'channel' }, //, editor:"number", editorParams:{min:1, max:32, step:1, verticalNavigation:"table"}, validator:"unique"},
		{ title: 'Name', field: 'name' } //, editor:"input"}
	]}
/>

<button onclick={() => console.log(table.getData())}>Print table data</button>
