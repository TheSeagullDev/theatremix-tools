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
    any microphones to it. Certain labels may be abbreviated for space. Do not assign any labels corresponding to the entire cast, such as "All" or "Ensemble" or similar.

	You must also output a list of microphone numbers and a corresponding label for that microphone that is 12 characters or less in length. The label should accurately represent the role of the microphone. Focus on clarity, understanding and brevity. DO NOT exceed 12 characters in length.

	Also output an explanation of your overall reasoning while labeling, areas where you were confused, and where the audio engineer should focus on double-checking the programming. As a part of this explanation, be sure to address all labels that you were unclear on.

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
					required: ['label', 'channels', 'reasoning']
				}
			},

			micList: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						micNumber: {
							type: 'number'
						},
						name: {
							type: 'string'
						}
					},
					required: ['micNumber', 'name']
				}
			},

			explanation: {
				type: 'string'
			}
		},

		propertyOrdering: ['channelLabels', 'micList', 'explanation'],
		required: ['channelLabels', 'micList', 'explanation']
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
	console.log('RAW:', response.text);

	const clean = response.text
		.replace(/```json/g, '')
		.replace(/```/g, '')
		.trim();
	console.log(clean);
	return json(JSON.parse(clean));
}
