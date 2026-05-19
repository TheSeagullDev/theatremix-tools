import { json } from '@sveltejs/kit';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';

export async function POST({ request }) {
	const { labels, castList } = await request.json();

	const prompt = `
    You are given a cast list containing:

    performer names microphone channel numbers all roles each performer plays

    You are also given a list of all the DCA labels the sound engineer has decided
    are neccesary for the show, without regard for which actor plays which role.
    Your task is to assign the proper microphone channel number or numbers to each
    label, determining if the label corresponds to an individual actor or group. If
    the label or group is unclear or likely to vary between scenes, do not assign
    any microphones to it. Certain labels may be abbreviated for space.

    Rules:

    A DCA label may represent: a single character a group of characters ensemble
    sections functional groups For each label, output the array of microphone
    channel numbers associated with performers who play those roles. If a performer
    plays multiple roles, include their channel in every relevant label. Do not
    invent microphone numbers. Return ONLY valid JSON matching the schema.

    Labels: ${labels}

    Cast List: ${castList}

    `;

	const callSchema = {
		type: 'object',
		properties: {
			channelLabels: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						label: {
							type: 'string'
						},
						channels: {
							type: 'array',
							items: {
								type: 'number'
							}
						},
						reasoning: {
							type: 'string'
						}
					},
					propertyOrdering: ['label', 'channels', 'reasoning'],
					required: ['label', 'channels']
				}
			}
		},
		propertyOrdering: ['channelLabels'],
		required: ['channelLabels']
	};

	const ai = new GoogleGenAI({
		apiKey: GEMINI_API_KEY
	});

	const response = await ai.models.generateContent({
		model: 'gemini-3.1-flash-lite',
		contents: prompt,
		config: {
			responseMimeType: 'application/json',
			responseSchema: callSchema
		}
	});
    console.log("RAW:", response.text)

	const clean = response.text
		.replace(/```json/g, '')
		.replace(/```/g, '')
		.trim();
	console.log(clean);
	return json(JSON.parse(clean));
}
