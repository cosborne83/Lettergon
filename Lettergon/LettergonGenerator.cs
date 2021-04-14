using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Lettergon
{
    public class LettergonGenerator
    {
        private readonly Dictionary<int, List<WordInfo>> _wordsByLength = new Dictionary<int, List<WordInfo>>();
        private readonly Random _random = new Random();

        public LettergonGenerator(string wordFile)
        {
            using (var reader = new StreamReader(wordFile))
            {
                var allWords = new HashSet<string>();
                string word;
                while ((word = reader.ReadLine()) != null)
                {
                    word = word.ToLower();
                    if (!IsOnlyAlpha(word) || !allWords.Add(word)) continue;
                    if (!_wordsByLength.TryGetValue(word.Length, out var words))
                    {
                        words = new List<WordInfo>();
                        _wordsByLength.Add(word.Length, words);
                    }

                    words.Add(new WordInfo(word, GetLetterCounts(word)));
                }
            }
        }

        public Puzzle CreatePuzzle(int pangramLength, int minWordLength)
        {
            if (!_wordsByLength.TryGetValue(pangramLength, out var pangrams)) return null;
            var pangramWordInfo = pangrams[_random.Next(0, pangrams.Count)];
            var pangramLetterCounts = pangramWordInfo.LetterCounts;
            var shuffledLetters = Shuffle(pangramWordInfo.Word);
            var keyLetterIndex = _random.Next(0, pangramLength);
            var keyLetter = shuffledLetters[keyLetterIndex];
            var words = new SortedSet<string>();
            foreach (var pair in _wordsByLength)
            {
                if (pair.Key < minWordLength || pair.Key > pangramLength) continue;
                foreach (var wordInfo in pair.Value)
                {
                    if (!wordInfo.IsValid(pangramLetterCounts, keyLetter)) continue;
                    words.Add(wordInfo.Word);
                }
            }

            return new Puzzle(shuffledLetters, keyLetterIndex, minWordLength, words.ToArray());
        }

        private char[] Shuffle(string word)
        {
            var result = word.ToCharArray();
            for (var i = result.Length - 1; i > 0; i--)
            {
                var j = _random.Next(0, i + 1);
                var temp = result[j];
                result[j] = result[i];
                result[i] = temp;
            }

            return result;
        }

        private static bool IsOnlyAlpha(string line)
        {
            foreach (var c in line)
            {
                if (!char.IsLetter(c)) return false;
            }

            return true;
        }

        private static LetterCount[] GetLetterCounts(string word)
        {
            var countsByLetter = new SortedDictionary<char, int>();
            foreach (var c in word)
            {
                countsByLetter.TryGetValue(c, out var count);
                countsByLetter[c] = count + 1;
            }

            var result = new LetterCount[countsByLetter.Count];
            var index = 0;
            foreach (var pair in countsByLetter)
            {
                result[index++] = new LetterCount(pair.Key, pair.Value);
            }

            return result;
        }

        private class WordInfo
        {
            public readonly string Word;
            public readonly LetterCount[] LetterCounts;

            public WordInfo(string word, LetterCount[] letterCounts)
            {
                Word = word;
                LetterCounts = letterCounts;
            }

            public bool IsValid(LetterCount[] pangramLetterCounts, char keyLetter)
            {
                var myIndex = 0;
                var pangramIndex = 0;

                var hasKey = false;
                while (myIndex < LetterCounts.Length)
                {
                    if (pangramIndex >= pangramLetterCounts.Length) return false;
                    var myLetter = LetterCounts[myIndex++];
                    var otherLetter = pangramLetterCounts[pangramIndex++];
                    if (!hasKey)
                    {
                        if (myLetter.Letter == keyLetter)
                        {
                            hasKey = true;
                        }
                        else if (myLetter.Letter > keyLetter)
                        {
                            return false;
                        }
                    }

                    if (myLetter.Letter > otherLetter.Letter)
                    {
                        if (pangramIndex >= pangramLetterCounts.Length) return false;
                        do
                        {
                            otherLetter = pangramLetterCounts[pangramIndex++];
                        } while (myLetter.Letter > otherLetter.Letter && pangramIndex < pangramLetterCounts.Length);

                        if (myLetter.Letter != otherLetter.Letter) return false;
                        if (myLetter.Count > otherLetter.Count) return false;
                    }
                    else if (myLetter.Letter < otherLetter.Letter || myLetter.Count > otherLetter.Count)
                    {
                        return false;
                    }
                }

                return hasKey;
            }
        }

        private struct LetterCount
        {
            public readonly char Letter;
            public readonly int Count;

            public LetterCount(char letter, int count)
            {
                Letter = letter;
                Count = count;
            }
        }
    }

    public class Puzzle
    {
        public char[] Letters { get; }
        public int KeyLetterIndex { get; }
        public int MinWordLength { get; }
        public string[] Words { get; }

        public Puzzle(char[] letters, int keyLetterIndex, int minWordLength, string[] words)
        {
            Letters = letters;
            KeyLetterIndex = keyLetterIndex;
            MinWordLength = minWordLength;
            Words = words;
        }
    }
}
