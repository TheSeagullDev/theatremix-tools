<script>
	import { getSQL } from '$lib/sqlite';

	let uploadedFile = $state(null);
	let dbBuffer = null;

	let db;

	let labels = $state();
	let channels = $state();
	let cues;
	let conflicts = $state();
	let loading = $state(false);

	let castList = $state();

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

		cues = query(db, 'SELECT * FROM cues;');
		console.log(cues);
		channels = query(db, 'SELECT * FROM profiles;');
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

	async function analyzeCues(db, rows) {
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
		const labelList = [];
		for (const [label, occurences] of Object.entries(labelMap)) {
			labelList.push(label);
		}
		console.log(labelList);

		const res = await fetch('/api/generate', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				labels: labelList,
				castList: castList
			})
		});

		const data = await res.json();
		console.log(data);

		for (const assignment of data.channelLabels) {
			const occurrences = labelMap[assignment.label];

			if (!occurrences) continue;

			const channelString = assignment.channels.join(',');

			for (const occ of occurrences) {
				db.run(
					`UPDATE cues
					SET ${occ.channelCol} = ?
					WHERE number = ? AND point = ?`,
					[channelString, occ.cueNum, occ.cuePoint]
				);
			}
		}

		loading = false;
		downloadDB();
		conflicts = findInCueChannelConflicts(db);
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

	function findInCueChannelConflicts(db) {
		const cues = query(db, 'SELECT * FROM cues;');
		const conflicts = [];

		for (const cue of cues) {
			// channel -> list of DCAs inside THIS cue
			const channelToDcas = {};

			for (let i = 1; i <= 8; i++) {
				const dca = `dca0${i}`;
				const rawChannels = cue[`${dca}Channels`];

				if (!rawChannels || rawChannels.trim() === '') continue;

				const channels = rawChannels
					.split(',')
					.map((c) => c.trim())
					.filter(Boolean)
					.map(Number)
					.filter((n) => !Number.isNaN(n));

				for (const ch of channels) {
					if (!channelToDcas[ch]) {
						channelToDcas[ch] = [];
					}

					channelToDcas[ch].push(dca);
				}
			}

			// now detect conflicts inside this cue
			for (const [channel, dcas] of Object.entries(channelToDcas)) {
				if (dcas.length > 1) {
					conflicts.push({
						cue: Number(`${cue.number}.${cue.point}`),
						channel: Number(channel),
						dcas
					});
				}
			}
		}

		return conflicts;
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

<label for="castlist">Cast List:</label>
<textarea name="castlist" id="" bind:value={castList}></textarea>

<button
	class="m-4 rounded-md bg-slate-800 p-4 text-slate-50 hover:cursor-pointer hover:bg-slate-700"
	onclick={() => {
		loading = true;
		analyzeCues(db, cues);
	}}>Assign Cast</button
>

{#if loading}
	<h1>Loading...</h1>
{/if}

{#if conflicts}
	{#each conflicts as conflict}
		<div class="m-4 rounded-2xl bg-red-400 p-4">
			<h1 class="text-xl">Conflict!</h1>
			<p>Cue: {conflict.cue}, Channel: {conflict.channel}. Channel is in DCAs {conflict.dcas}</p>
		</div>
	{/each}
{/if}
