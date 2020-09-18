using System;
using System.Collections.Generic;
using Lettergon;
using Newtonsoft.Json;

namespace LettergonTest
{
    class Program
    {
        static void Main(string[] args)
        {
            var generator = new LettergonGenerator("words58k.txt");
            while (true)
            {
                var pangramLength = 7;
                var puzzle = generator.CreatePuzzle(pangramLength, 4);
                var found = new SortedDictionary<string, bool>();
                foreach (var pair in puzzle.Words) found[pair] = false;
                var remaining = found.Count;
                var puzzleLetters = new string(puzzle.Letters);
                var keyPointer = "^".PadLeft(puzzle.KeyLetterIndex + 1);
                Console.WriteLine("Letters: " + puzzleLetters);
                Console.WriteLine("Key:     " + keyPointer);
                Console.WriteLine();

                while (remaining > 0)
                {
                    Console.WriteLine("Enter word ({0} of {1} remaining):", remaining, found.Count);
                    var word = Console.ReadLine();
                    if (word == null) return;
                    if (word == "?")
                    {
                        Console.WriteLine("Letters: " + puzzleLetters);
                        Console.WriteLine("Key:     " + keyPointer);
                        Console.WriteLine();
                        PrintWords(pangramLength, found, false);
                        Console.WriteLine();
                        continue;
                    }

                    if (word == "***")
                    {
                        break;
                    }

                    word = word.ToLower();
                    if (!found.TryGetValue(word, out var isFound))
                    {
                        Console.WriteLine("Not a valid word");
                    }
                    else if (isFound)
                    {
                        Console.WriteLine("Already found!");
                    }
                    else
                    {
                        found[word] = true;
                        remaining--;
                        Console.WriteLine(word.Length == pangramLength ? "Pangram found!" : "Word found!");
                    }
                }

                if (remaining == 0) Console.WriteLine("You win!");
                PrintWords(pangramLength, found, true);
                Console.WriteLine();
            }
        }

        private static void PrintWords(int pangramLength, SortedDictionary<string, bool> found, bool showAll)
        {
            const string separator = "  ";
            var wordsAcross = Console.BufferWidth / (pangramLength + separator.Length);
            var lineCount = 0;
            foreach (var pair in found)
            {
                var display = showAll || pair.Value
                    ? pair.Key.Length == pangramLength ? pair.Key.ToUpperInvariant() : pair.Key.PadRight(pangramLength)
                    : new string('_', pangramLength);

                if (lineCount > 0) Console.Write(separator);

                if (showAll) Console.ForegroundColor = pair.Value ? ConsoleColor.Green : ConsoleColor.Red;
                Console.Write(display);
                Console.ResetColor();
                if (++lineCount >= wordsAcross)
                {
                    lineCount = 0;
                    Console.WriteLine();
                }
            }

            if (lineCount != 0) Console.WriteLine();
        }
    }
}
