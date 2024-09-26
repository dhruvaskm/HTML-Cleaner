import os
import json
from bs4 import BeautifulSoup
from wordsegment import load, segment

# Load the wordsegment model
load()

# Define directories
UPLOAD_FOLDER = './uploads'
DOWNLOAD_FOLDER = './downloads'

# Ensure the download folder exists
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

# Load dictionary from dictionary.json
def load_dictionary(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

word_dict = load_dictionary('dictionary.json')

def is_concatenated_word(word, dictionary):
    """Check if the word is concatenated by comparing with the dictionary."""
    return word not in dictionary

def process_text(text, dictionary):
    """Segment concatenated words while preserving original formatting and casing."""
    # Initialize an empty result list
    result = []
    current_word = ""
    
    for char in text:
        if char.isalnum() or char in "-_'":
            # Accumulate alphanumeric characters and specific special characters
            current_word += char
        else:
            # If there is a current word, process it
            if current_word:
                # Check if it is a concatenated word
                if is_concatenated_word(current_word, dictionary):
                    segmented = segment(current_word)
                    # Preserve casing by checking each word's original casing
                    preserved_segmented = []
                    for seg in segmented:
                        preserved_word = ''.join(
                            char.upper() if original.isupper() else char 
                            for char, original in zip(seg, current_word)
                        )
                        preserved_segmented.append(preserved_word)
                    result.append(' '.join(preserved_segmented))
                else:
                    result.append(current_word)  # Keep the original word
                
                current_word = ""  # Reset current_word

            # Handle spacing before "(" and after ")"
            if char == '(':
                result.append(' (')  # Add a space before "("
            elif char == ')':
                result.append(') ')  # Add a space after ")"
            else:
                result.append(char)

            # Check if the character is a punctuation mark that should be followed by a space
            if char in '.:,;':
                result.append(' ')  # Add a space after the punctuation

    # Process any remaining current_word after the loop
    if current_word:
        if is_concatenated_word(current_word, dictionary):
            segmented = segment(current_word)
            # Preserve casing
            preserved_segmented = []
            for seg in segmented:
                preserved_word = ''.join(
                    char.upper() if original.isupper() else char 
                    for char, original in zip(seg, current_word)
                )
                preserved_segmented.append(preserved_word)
            result.append(' '.join(preserved_segmented))
        else:
            result.append(current_word)

    # Join the result list into a single string
    return ''.join(result)

def process_cleaned_html():
    """Process the cleaned HTML file and segment concatenated words."""
    cleaned_file_path = os.path.join(UPLOAD_FOLDER, 'cleaned.html')

    if not os.path.isfile(cleaned_file_path):
        print("No cleaned.html file found in the uploads folder.")
        return

    with open(cleaned_file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # Parse HTML using BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')

    # Extract and process text from the HTML
    for tag in soup.find_all(text=True):
        if tag.parent.name not in ['script', 'style']:  # Ignore script/style tags
            modified_text = process_text(tag, word_dict)
            tag.replace_with(modified_text)  # Replace old text with the modified text

    # Save the modified HTML to the downloads folder
    modified_html_file_path = os.path.join(DOWNLOAD_FOLDER, 'modified_cleaned.html')
    with open(modified_html_file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))

    print(f'Modified HTML saved to: {modified_html_file_path}')

if __name__ == "__main__":
    process_cleaned_html()
