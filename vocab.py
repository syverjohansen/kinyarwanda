def process_frequency_list(input_file, output_file):
    # Dictionary to store word-rank pairs (using lowercase for comparison)
    word_ranks = {}
    
    # Read the input file
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            # Split the line and check if it has at least 2 columns
            parts = line.strip().split('\t')
            if len(parts) >= 2:
                try:
                    rank = int(parts[0])
                    word = parts[1]
                    
                    # Convert to lowercase for comparison
                    word_lower = word.lower()
                    
                    # Only keep the first occurrence (lowest rank) of each word
                    if word_lower not in word_ranks:
                        word_ranks[word_lower] = (rank, word)
                except ValueError:
                    continue  # Skip lines where rank isn't a number
    
    # Sort by rank and write to output file
    sorted_words = sorted(word_ranks.values(), key=lambda x: x[0])
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for rank, word in sorted_words:
            f.write(f"{rank}\t{word}\n")

# Usage
input_file = "/Users/syverjohansen/learning/kinyarwanda/kin_community_2022/kin_community_2022-words.txt"  # Replace with your input file name
output_file = "/Users/syverjohansen/learning/kinyarwanda/words.txt"  # Replace with desired output file name
process_frequency_list(input_file, output_file)