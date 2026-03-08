"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Send,
  Sparkles,
  User,
  Copy,
  Loader2,
  Wand2,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import {
  DEFAULT_MODEL,
  getChatResponse,
  getModels,
  improvePrompt,
  type AIModel,
  type ModelOption,
} from "../lib/api";
import ReactMarkdown from "react-markdown";
import { Typewriter } from "@/components/typewriter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Message = {
  role: "ai" | "user";
  content: string;
  isTyping?: boolean;
};

export function AiChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: "Hi, how can I help you today?",
      isTyping: false,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [modelCategories, setModelCategories] = useState<
    Record<string, ModelOption[]>
  >({});
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelHint, setModelHint] = useState("Loading models...");
  const [isImproving, setIsImproving] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setIsModelLoading(true);
      try {
        const catalog = await getModels();
        if (!active) return;
        setModelOptions(catalog.models);
        setModelCategories(catalog.categories);
        setModelHint(`Loaded ${catalog.models.length} models`);
        setSelectedModel((current) => {
          if (catalog.models.some((m) => m.id === current)) {
            return current;
          }
          return (catalog.models[0]?.id as AIModel) || DEFAULT_MODEL;
        });
      } catch (error) {
        if (!active) return;
        console.error("Failed to load models, using fallback list", error);
        setModelHint("Using fallback model list");
      } finally {
        if (active) {
          setIsModelLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Call the API
      const response = await getChatResponse(inputValue, selectedModel);

      // Extract the response text from the object
      let responseText =
        response?.reply || "Sorry, I couldn't generate a response.";

      // Add AI response with typing effect
      const aiMessage: Message = {
        role: "ai",
        content: responseText,
        isTyping: true,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // After the typing animation is complete, mark it as finished
      setTimeout(
        () => {
          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === prev.length - 1 ? { ...msg, isTyping: false } : msg,
            ),
          );
        },
        responseText.length * 30 + 1000,
      ); // Approximate time for typing + buffer
    } catch (error) {
      console.error("Error getting response:", error);
      // Add error message
      const errorMessage: Message = {
        role: "ai",
        content:
          "Sorry, there was an error processing your request. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Improve the prompt
  const handleImprovePrompt = async () => {
    if (!inputValue.trim()) return;

    setIsImproving(true);

    try {
      // Send just the prompt text, not an object
      const result = await improvePrompt(inputValue);

      if (result) {
        setInputValue(result);
      }
    } catch (error) {
      console.error("Error improving prompt:", error);
      // Show a user-friendly error message
      alert("Failed to improve prompt. Please try again.");
    } finally {
      setIsImproving(false);
    }
  };

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Copy message to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={toggleChat}
        className="fixed animate-bounce bottom-6 right-6 rounded-full w-20 h-20 p-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg z-50 transition-transform hover:scale-110"
        aria-label="Open chat"
      >
        <Bot size={40} className="text-white" />
      </Button>

      {/* Chat Modal */}
      {isOpen && (
        <div
          ref={chatRef}
          className="fixed bottom-[calc(5rem+1.2rem)] right-6 bg-white dark:bg-gray-900 p-6 rounded-xl border border-border w-[520px] h-[550px] shadow-xl z-50 flex flex-col bg-gradient-to-r from-purple-400/20 to-blue-400/20 backdrop-blur-sm text-black"
        >
          {/* Header */}
          <div className="flex flex-col space-y-2 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot size={24} className="text-blue-600 dark:text-blue-400" />
                <h2 className="font-bold text-xl tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Prompt Hash AI
                </h2>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 min-w-[200px] justify-between border-gray-300 bg-white/80 text-sm font-semibold text-gray-800 hover:border-blue-500 hover:bg-white focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                    disabled={isModelLoading || !modelOptions.length}
                  >
                    <span className="truncate text-left">
                      {isModelLoading
                        ? "Loading models..."
                        : modelOptions.find((m) => m.id === selectedModel)?.displayName ||
                          selectedModel}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <Command>
                    <CommandGroup heading="Models">
                      {Object.keys(modelCategories).length
                        ? Object.entries(modelCategories).map(
                            ([category, options]) => (
                              <div key={category} className="border-b last:border-0">
                                <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-gray-500">
                                  {category}
                                </div>
                                {options.map((option) => (
                                  <CommandItem
                                    key={option.id}
                                    value={option.id}
                                    onSelect={() =>
                                      setSelectedModel(option.id as AIModel)
                                    }
                                    className="flex items-start gap-2 py-2"
                                  >
                                    <Check
                                      className={cn(
                                        "h-4 w-4 mt-0.5",
                                        selectedModel === option.id
                                          ? "opacity-100 text-blue-600"
                                          : "opacity-0",
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">
                                        {option.displayName}
                                      </span>
                                      <span className="text-[11px] text-gray-500">
                                        {option.id}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </div>
                            ),
                          )
                        : modelOptions.map((option) => (
                            <CommandItem
                              key={option.id}
                              value={option.id}
                              onSelect={() =>
                                setSelectedModel(option.id as AIModel)
                              }
                              className="flex items-start gap-2 py-2"
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4 mt-0.5",
                                  selectedModel === option.id
                                    ? "opacity-100 text-blue-600"
                                    : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {option.displayName}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  {option.id}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {modelHint ||
                "Ask me anything about prompts and the marketplace"}
            </p>
          </div>

          {/* Chat Container */}
          <div className="flex-1 overflow-y-auto pr-4 space-y-4 ">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 my-4 text-sm ${
                  message.role === "ai"
                    ? "bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg"
                    : "bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg"
                }`}
              >
                <span className="relative flex shrink-0 overflow-hidden rounded-full w-10 h-10">
                  <div
                    className={`rounded-full p-2 ${
                      message.role === "ai"
                        ? "bg-blue-100 dark:bg-blue-900"
                        : "bg-purple-100 dark:bg-purple-900"
                    }`}
                  >
                    {message.role === "ai" ? (
                      <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                </span>
                <div className="leading-relaxed flex-1">
                  <span
                    className={`block font-bold mb-1 ${
                      message.role === "ai"
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-purple-700 dark:text-purple-300"
                    }`}
                  >
                    {message.role === "ai" ? "AI" : "You"}
                  </span>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {message.role === "ai" && message.isTyping ? (
                      <Typewriter text={message.content} />
                    ) : (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
                {/* Copy button - only for user messages */}
                {message.role === "ai" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(message.content)}
                    className="text-purple-500 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 my-4 text-sm bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg animate-pulse">
                <span className="relative flex shrink-0 overflow-hidden rounded-full w-10 h-10">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2">
                    <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </span>
                <div className="leading-relaxed flex-1">
                  <span className="block font-bold mb-1 text-blue-700 dark:text-blue-300">
                    AI
                  </span>
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-blue-600 dark:text-blue-400">
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2">
                <Input
                  className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleImprovePrompt}
                  disabled={isLoading || isImproving || !inputValue.trim()}
                  title="Improve prompt"
                  className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                >
                  {isImproving ? (
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  ) : (
                    <Wand2 className="h-5 w-5 text-purple-600" />
                  )}
                </Button>
              </div>
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-2 rounded-md transition-all"
              >
                <Send className="h-5 w-5 mr-2" />
                Send
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
