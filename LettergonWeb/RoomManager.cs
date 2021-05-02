using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using System.Web;
using System.Web.WebSockets;
using Lettergon;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace LettergonWeb
{
    public enum JoinStatus
    {
        Success,
        NameInUse,
        RoomFull
    }

    public class RoomManager
    {
        private readonly Dictionary<string, Room> _rooms = new Dictionary<string, Room>();
        private readonly LettergonGenerator _generator;
        private readonly int _maxPlayersPerRoom;

        public RoomManager(LettergonGenerator generator, int maxPlayersPerRoom)
        {
            _generator = generator;
            _maxPlayersPerRoom = maxPlayersPerRoom;
        }

        public JoinStatus TryJoinRoom(HttpContext context, string roomName, string playerName)
        {
            Room room;
            lock (_rooms)
            {
                if (!_rooms.TryGetValue(roomName, out room))
                {
                    room = new Room(this, _generator, roomName);
                    _rooms.Add(roomName, room);
                }
            }

            return room.TryAddPlayer(context, playerName, _maxPlayersPerRoom);
        }

        private void RemoveRoom(string roomName)
        {
            lock (_rooms)
            {
                _rooms.Remove(roomName);
            }
        }

        private class Room
        {
            private readonly object _sync = new object();
            private readonly Dictionary<string, Player> _players = new Dictionary<string, Player>();
            private readonly RoomManager _manager;
            private readonly LettergonGenerator _generator;
            private readonly string _name;
            private State _state;

            public Room(RoomManager manager, LettergonGenerator generator, string name)
            {
                _manager = manager;
                _generator = generator;
                _name = name;
            }

            private void NewGame()
            {
                lock (_sync)
                {
                    _state = new State(_generator.CreatePuzzle(7, 4));
                    Broadcast(GetMessage("init", GetInitData()));
                }
            }

            private void EndGame()
            {
                lock (_sync)
                {
                    var data = _state?.EndGame();
                    if (data == null) return;
                    Broadcast(GetMessage("end", data));
                }
            }

            private JObject GetMessage(string messageType, JObject data)
            {
                return new JObject
                {
                    { "type", messageType },
                    { "data", data }
                };
            }

            private JObject GetInitData()
            {
                var players = new JArray();
                foreach (var playerName in _players.Keys) players.Add(playerName);

                var data = new JObject
                {
                    { "players", players }
                };

                if (_state != null)
                {
                    data.Add("state", _state.GetGameState());
                }

                return data;
            }

            public JoinStatus TryAddPlayer(HttpContext context, string playerName, int maxPlayers)
            {
                lock (_sync)
                {
                    if (_players.Count >= maxPlayers) return JoinStatus.RoomFull;
                    if (_players.ContainsKey(playerName)) return JoinStatus.NameInUse;

                    var player = new Player(this, playerName);
                    var joinData = new JObject
                    {
                        { "name", playerName }
                    };

                    Broadcast(GetMessage("join", joinData));
                    _players.Add(playerName, player);
                    context.AcceptWebSocketRequest(player.Accept);
                    player.Send(Serialize(GetMessage("init", GetInitData())));
                    return JoinStatus.Success;
                }
            }

            private void RemovePlayer(string playerName)
            {
                lock (_sync)
                {
                    if (!_players.Remove(playerName)) return;
                    if (_players.Count > 0)
                    {
                        var data = new JObject
                        {
                            { "name", playerName }
                        };
                        Broadcast(GetMessage("leave", data));
                        return;
                    }

                    _manager.RemoveRoom(_name);
                }
            }

            private void CheckWord(Player player, string word)
            {
                lock (_sync)
                {
                    string messageType;
                    var broadcast = false;
                    switch (_state.CheckWord(player, word, out var data))
                    {
                        case State.CheckResult.NotFound:
                            messageType = "not-found";
                            break;
                        case State.CheckResult.AlreadyFound:
                            messageType = "already-found";
                            break;
                        case State.CheckResult.Found:
                            messageType = "found";
                            broadcast = true;
                            break;
                        default:
                            return;
                    }

                    var message = GetMessage(messageType, data);
                    if (broadcast)
                    {
                        Broadcast(message);
                    }
                    else
                    {
                        player.Send(Serialize(message));
                    }
                }
            }

            private void Broadcast(JObject message)
            {
                var serialized = Serialize(message);
                foreach (var player in _players.Values) player.Send(serialized);
            }

            private static byte[] Serialize(JToken message)
            {
                return Encoding.UTF8.GetBytes(message.ToString(Formatting.None));
            }

            private class State
            {
                private static readonly DateTime Epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);

                private readonly Puzzle _puzzle;
                private readonly Dictionary<string, int> _words;
                private readonly string[] _finders;
                private readonly long _startTime;
                private int _remaining;
                private long? _endTime;

                public State(Puzzle puzzle)
                {
                    _puzzle = puzzle;
                    var words = puzzle.Words;
                    _words = new Dictionary<string, int>(words.Length);
                    _finders = new string[words.Length];
                    for (var i = 0; i < words.Length; i++) _words.Add(words[i], i);
                    _startTime = GetTimestamp();
                    _remaining = words.Length;
                }

                private static long GetTimestamp()
                {
                    return (long)(DateTime.UtcNow - Epoch).TotalMilliseconds;
                }

                public JObject GetGameState()
                {
                    var endTime = _endTime;
                    var message = new JObject
                    {
                        { "start", _startTime },
                        {
                            "puzzle", new JObject
                            {
                                { "Letters", JArray.FromObject(_puzzle.Letters) },
                                { "KeyLetterIndex", _puzzle.KeyLetterIndex },
                                { "MinWordLength", _puzzle.MinWordLength }
                            }
                        },
                        { "found", GetWordsArray(endTime == null) }
                    };

                    if (endTime != null) message.Add("end", endTime.Value);
                    return message;
                }

                private JArray GetWordsArray(bool onlyFound)
                {
                    var found = new JArray();
                    for (var i = 0; i < _finders.Length; i++) found.Add(new JObject());
                    foreach (var pair in _words)
                    {
                        var index = pair.Value;
                        var finder = _finders[index];
                        if (finder == null && onlyFound) continue;
                        found[index] = new JObject
                        {
                            { "w", pair.Key },
                            { "p", finder ?? string.Empty }
                        };
                    }

                    return found;
                }

                public enum CheckResult
                {
                    NotFound,
                    AlreadyFound,
                    Found
                }

                public CheckResult CheckWord(Player player, string word, out JObject data)
                {
                    if (!_words.TryGetValue(word, out var index))
                    {
                        data = new JObject
                        {
                            { "word", word }
                        };
                        return CheckResult.NotFound;
                    }

                    ref var finder = ref _finders[index];
                    if (finder != null)
                    {
                        data = new JObject
                        {
                            { "word", word }
                        };
                        return CheckResult.AlreadyFound;
                    }

                    data = new JObject
                    {
                        { "word", word },
                        { "index", index },
                        { "finder", finder = player.Name }
                    };

                    if (--_remaining == 0)
                    {
                        var endTime = GetTimestamp();
                        _endTime = endTime;
                        data.Add("end", endTime);
                    }

                    return CheckResult.Found;
                }

                public JObject EndGame()
                {
                    if (_endTime != null) return null;
                    var endTime = GetTimestamp();
                    _endTime = endTime;

                    return new JObject
                    {
                        { "found", GetWordsArray(false) },
                        { "end", endTime }
                    };
                }
            }

            private class Player
            {
                private readonly Channel<byte[]> _channel;
                private readonly ChannelWriter<byte[]> _channelWriter;
                private readonly Room _room;
                private readonly CancellationTokenSource _cancellationTokenSource = new CancellationTokenSource();
                private WebSocket _webSocket;

                public string Name { get; }

                public Player(Room room, string name)
                {
                    _channel = Channel.CreateUnbounded<byte[]>(new UnboundedChannelOptions { SingleReader = true, SingleWriter = true });
                    _channelWriter = _channel.Writer;
                    _room = room;
                    Name = name;
                }

                public async Task Accept(AspNetWebSocketContext context)
                {
                    _webSocket = context.WebSocket;
                    _ = SendMessages();
                    var buffer = new byte[64];
                    var cancellationToken = _cancellationTokenSource.Token;
                    WebSocketCloseStatus closeStatus;
                    while (true)
                    {
                        try
                        {
                            var receiveResult = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cancellationToken);
                            if (receiveResult.MessageType == WebSocketMessageType.Close)
                            {
                                closeStatus = WebSocketCloseStatus.NormalClosure;
                                break;
                            }

                            if (!receiveResult.EndOfMessage)
                            {
                                closeStatus = WebSocketCloseStatus.MessageTooBig;
                                break;
                            }

                            if (receiveResult.MessageType != WebSocketMessageType.Text)
                            {
                                closeStatus = WebSocketCloseStatus.InvalidMessageType;
                                break;
                            }

                            var message = JObject.Parse(Encoding.UTF8.GetString(buffer, 0, receiveResult.Count));
                            switch (message["type"].Value<string>())
                            {
                                case "check":
                                    var word = message["word"].Value<string>().ToLower();
                                    _room.CheckWord(this, word);
                                    continue;
                                case "new":
                                    _room.NewGame();
                                    continue;
                                case "end":
                                    _room.EndGame();
                                    continue;
                            }

                            closeStatus = WebSocketCloseStatus.Empty;
                            break;
                        }
                        catch
                        {
                            closeStatus = WebSocketCloseStatus.InternalServerError;
                            break;
                        }
                    }

                    _cancellationTokenSource.Cancel();
                    _room.RemovePlayer(Name);
                    await _webSocket.CloseAsync(closeStatus, string.Empty, new CancellationTokenSource(5000).Token);
                }

                private async Task SendMessages()
                {
                    var cancellationToken = _cancellationTokenSource.Token;
                    var reader = _channel.Reader;
                    while (true)
                    {
                        try
                        {
                            var buffer = await reader.ReadAsync(cancellationToken);
                            await _webSocket.SendAsync(new ArraySegment<byte>(buffer), WebSocketMessageType.Text, true, cancellationToken);
                        }
                        catch
                        {
                            break;
                        }
                    }

                    _cancellationTokenSource.Cancel();
                }

                public void Send(byte[] message)
                {
                    _channelWriter.TryWrite(message);
                }
            }
        }
    }
}