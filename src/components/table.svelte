<script>
	import { TabulatorFull as Tabulator } from 'tabulator-tables';
	import { onMount } from 'svelte';

	let { data, columns, table = $bindable() } = $props();

	let tableComponent;

	onMount(() => {
		table = new Tabulator(tableComponent, {
			data: data, //link data to table
			reactiveData: true,
			layout: "fitColumns",
			clipboard: true,
			clipboardPasteAction:"replace", //enable data reactivity
			columns: columns //define table columns
		});
	});
</script>

<div bind:this={tableComponent}></div>

<svelte:head>
	<link
		href="https://unpkg.com/tabulator-tables@4.9.1/dist/css/tabulator.min.css"
		rel="stylesheet"
	/>
</svelte:head>
