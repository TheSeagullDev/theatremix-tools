<script>
	import { getSQL } from '$lib/sqlite';

	let uploadedFile = $state(null);
	let dbBuffer = null;

	let db;

	let labels = $state();
	let channels = $state();

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

	async function handleFile(event) {
		const file = event.target.files[0];

		if (!file) return;

		uploadedFile = file;

		// SQLite DB files are binary, so use arrayBuffer()
		dbBuffer = await file.arrayBuffer();

		console.log('File:', uploadedFile);
		console.log('ArrayBuffer:', dbBuffer);

		const SQL = await getSQL();

		db = new SQL.Database(new Uint8Array(dbBuffer));

		const cues = query(db, 'SELECT * FROM cues;');
		console.log(cues);
		channels = query(db, 'SELECT * FROM profiles;');
		analyzeCues(db, cues);
	}

	function downloadDB() {
		const data = db.export();

		const blob = new Blob([data]);

		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = uploadedFile.name;
		a.click();

		URL.revokeObjectURL(url);
	}

	function analyzeCues(db, rows) {
		console.log(channels);
		const labelMap = {};

		for (const row of rows) {
			for (let i = 1; i <= 8; i++) {
				const label = row[`dca0${i}Label`];

				if (!label) continue;

				if (!labelMap[label]) {
					labelMap[label] = [];
				}

				labelMap[label].push({
					cueNum: row.number,
					cuePoint: row.point,
					labelCol: `dca0${i}Label`,
					channelCol: `dca0${i}Channels`
				});
			}
		}

		console.log(labelMap);
		labels = labelMap;
		/* for(const [label, occurences] of Object.entries(labelMap)) {
			console.log(`Current DCA: ${label}`);
			let userChannels = prompt(`Insert Channel or comma separated channels for Label: ${label}`);
			occurences.forEach(occurence => {
				console.log(`Set cue ${occurence.cueNum}.${occurence.cuePoint} DCA ${occurence.channelCol} to ${userChannels}`);
				db.run(`UPDATE "cues" SET ${occurence.channelCol} = (?) WHERE number = (?) AND point = (?);`, [userChannels, occurence.cueNum, occurence.cuePoint]);
			});
		}
		console.log(query(db, 'SELECT * FROM cues;'));

		downloadDB(); */
	}
</script>

<h1>Upload TheatreMix DB</h1>

<input
	class="m-4 rounded-md bg-slate-800 p-4 text-slate-50 hover:cursor-pointer hover:bg-slate-700"
	type="file"
	accept=".tmix"
	onchange={handleFile}
/>

{#if uploadedFile}
	<p>
		Loaded:
		<strong>{uploadedFile.name}</strong>
	</p>

	<p>Size: {uploadedFile.size} bytes</p>
{/if}

{#if labels}
	{#each Object.entries(labels) as [label, occurences]}
		<div>
			<label for="">{label}</label>
			<select multiple>
			{#each channels as channel}
				<option value={channel.channel}>({channel.channel}) {channel.name}</option>
			{/each}
			</select>
		</div>
	{/each}
{/if}
