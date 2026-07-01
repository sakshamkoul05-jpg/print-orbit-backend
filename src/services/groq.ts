import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'rect' | 'circle' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  rotation: number;
  opacity: number;
}

const FONTS = ['Inter', 'Space Grotesk', 'Playfair Display', 'Montserrat', 'Poppins', 'Roboto'];

const DESIGN_SYSTEM_PROMPT = `You are a professional print designer AI for PrintOrbit, an Indian print-on-demand platform.

Your task is to generate complete, print-ready designs as JSON.

DESIGN RULES:
- Use proper typography hierarchy (headings larger than body)
- Ensure sufficient color contrast (minimum 4.5:1 for text)
- Maintain 16px minimum padding from edges
- Use max 3 font families per design
- Keep designs clean, professional, and modern
- Use the following font families: ${FONTS.join(', ')}

Return ONLY valid JSON. No markdown, no explanation.`;

function buildGeneratePrompt(prompt: string, width: number, height: number, productType: string): string {
  return `Generate a design for a ${productType} with dimensions ${width}x${height}px.

User request: "${prompt}"

Return JSON:
{
  "backgroundColor": "#hex",
  "elements": [
    {
      "type": "text|rect|circle|line",
      "x": number, "y": number,
      "width": number, "height": number,
      "fill": "#hex",
      "text": "string (only for text type)",
      "fontSize": number (for text type),
      "fontFamily": "string (from allowed list)",
      "fontWeight": "normal|bold",
      "rotation": number (0-360),
      "opacity": number (0-1)
    }
  ]
}`;
}

function buildEditPrompt(
  command: string,
  elements: CanvasElement[],
  backgroundColor: string
): string {
  return `Current design:
Background: ${backgroundColor}
Elements: ${JSON.stringify(elements, null, 2)}

User wants to modify: "${command}"

Return the COMPLETE updated design JSON. Preserve all elements not mentioned in the edit.
{
  "backgroundColor": "#hex",
  "elements": [ ... ]
}`;
}

function buildSuggestionPrompt(elements: CanvasElement[], backgroundColor: string): string {
  return `Analyze this print design and suggest improvements:
Background: ${backgroundColor}
Elements: ${JSON.stringify(elements, null, 2)}

Return JSON:
{
  "suggestions": [
    {
      "title": "short title",
      "description": "detailed suggestion",
      "type": "color|typography|layout|contrast|spacing",
      "priority": "high|medium|low"
    }
  ]
}

Focus on: color harmony, font pairings, layout balance, contrast issues, spacing.`;
}

export async function generateDesign(
  prompt: string,
  width: number,
  height: number,
  productType: string = 'design'
) {
  const start = Date.now();
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: DESIGN_SYSTEM_PROMPT },
      { role: 'user', content: buildGeneratePrompt(prompt, width, height, productType) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const design = JSON.parse(content);

  return {
    success: true,
    design: {
      backgroundColor: design.backgroundColor || '#FFFFFF',
      elements: (design.elements || []).map((el: any, i: number) => ({
        id: `ai_${Date.now()}_${i}`,
        type: el.type || 'rect',
        x: el.x || 0,
        y: el.y || 0,
        width: el.width || 100,
        height: el.height || 100,
        fill: el.fill || '#000000',
        text: el.text,
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        fontWeight: el.fontWeight,
        rotation: el.rotation || 0,
        opacity: el.opacity ?? 1,
      })),
    },
    generationTime: Date.now() - start,
  };
}

export async function editDesign(
  command: string,
  currentElements: CanvasElement[],
  backgroundColor: string
) {
  const start = Date.now();
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: DESIGN_SYSTEM_PROMPT },
      { role: 'user', content: buildEditPrompt(command, currentElements, backgroundColor) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.5,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const design = JSON.parse(content);

  return {
    success: true,
    design: {
      backgroundColor: design.backgroundColor || backgroundColor,
      elements: (design.elements || []).map((el: any, i: number) => ({
        id: `ai_${Date.now()}_${i}`,
        type: el.type || 'rect',
        x: el.x || 0,
        y: el.y || 0,
        width: el.width || 100,
        height: el.height || 100,
        fill: el.fill || '#000000',
        text: el.text,
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        fontWeight: el.fontWeight,
        rotation: el.rotation || 0,
        opacity: el.opacity ?? 1,
      })),
    },
    changes: ['Applied requested edits'],
    generationTime: Date.now() - start,
  };
}

export async function suggestImprovements(elements: CanvasElement[], backgroundColor: string) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: DESIGN_SYSTEM_PROMPT },
      { role: 'user', content: buildSuggestionPrompt(elements, backgroundColor) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const result = JSON.parse(content);

  return {
    success: true,
    suggestions: result.suggestions || [],
  };
}

export async function generateColorPalette(description: string) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a color palette designer. Generate harmonious color palettes as JSON.',
      },
      {
        role: 'user',
        content: `Generate a color palette for: "${description}"

Return JSON:
{
  "name": "palette name",
  "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "description": "why this palette works"
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.6,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || '{}';
  return JSON.parse(content);
}

export async function enhancePrompt(prompt: string, productType: string) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a design brief expert. Expand short user prompts into detailed design briefs.',
      },
      {
        role: 'user',
        content: `Expand this brief prompt into a detailed design brief for a ${productType}:
"${prompt}"

Return a concise, enhanced version (2-3 sentences). Just the enhanced prompt, nothing else.`,
      },
    ],
    temperature: 0.5,
    max_tokens: 300,
  });

  return {
    success: true,
    enhanced: response.choices[0]?.message?.content || prompt,
  };
}
