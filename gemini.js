const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function giveContent(text) {
  const systemPrompt =
    "you are an AI assistant , Summarize the following JSON content. Only provide exact summary of the key points and avoid adding any extra information.";
  const prompt = text;
  const result = await model.generateContent(systemPrompt + prompt);
  return result.response.text();
}

module.exports = giveContent;
