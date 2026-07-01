import { Router, type Request, type Response } from 'express';
import {
  generateDesign,
  editDesign,
  suggestImprovements,
  generateColorPalette,
  enhancePrompt,
} from '../services/groq.js';

const router = Router();

router.post('/generate-design', async (req: Request, res: Response) => {
  try {
    const { prompt, productType, canvasWidth, canvasHeight } = req.body;

    if (!prompt || !canvasWidth || !canvasHeight) {
      return res.status(400).json({ error: 'prompt, canvasWidth, and canvasHeight are required' });
    }

    const result = await generateDesign(prompt, canvasWidth, canvasHeight, productType || 'design');
    res.json(result);
  } catch (error: any) {
    console.error('AI generate error:', error);
    res.status(500).json({ error: error.message || 'AI generation failed' });
  }
});

router.post('/edit-design', async (req: Request, res: Response) => {
  try {
    const { command, currentElements, backgroundColor } = req.body;

    if (!command || !currentElements) {
      return res.status(400).json({ error: 'command and currentElements are required' });
    }

    const result = await editDesign(command, currentElements, backgroundColor || '#FFFFFF');
    res.json(result);
  } catch (error: any) {
    console.error('AI edit error:', error);
    res.status(500).json({ error: error.message || 'AI edit failed' });
  }
});

router.post('/suggest-improvements', async (req: Request, res: Response) => {
  try {
    const { elements, backgroundColor } = req.body;

    if (!elements) {
      return res.status(400).json({ error: 'elements are required' });
    }

    const result = await suggestImprovements(elements, backgroundColor || '#FFFFFF');
    res.json(result);
  } catch (error: any) {
    console.error('AI suggestions error:', error);
    res.status(500).json({ error: error.message || 'AI suggestions failed' });
  }
});

router.post('/generate-color-palette', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'description is required' });
    }

    const result = await generateColorPalette(description);
    res.json(result);
  } catch (error: any) {
    console.error('AI palette error:', error);
    res.status(500).json({ error: error.message || 'Color palette generation failed' });
  }
});

router.post('/enhance-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt, productType } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const result = await enhancePrompt(prompt, productType || 'design');
    res.json(result);
  } catch (error: any) {
    console.error('AI enhance error:', error);
    res.status(500).json({ error: error.message || 'Prompt enhancement failed' });
  }
});

export default router;
