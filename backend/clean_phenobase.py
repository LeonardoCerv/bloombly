import pandas as pd
import os
import json
import numpy as np

# Get all CSV files from the csv directory
csv_directory = '../data/csv/'
csv_files = [f for f in os.listdir(csv_directory) if f.endswith('.csv')]

print(f"Found {len(csv_files)} CSV files to process: {csv_files}")

# Process each CSV file
all_dataframes = []

for csv_file in csv_files:
    print(f"Processing {csv_file}...")
    
    try:
        # Read the CSV file
        df = pd.read_csv(os.path.join(csv_directory, csv_file))
        
        # Add source file info for tracking
        df['source_file'] = csv_file
        
        # Filter for traits containing 'flower' (if trait column exists)
        if 'trait' in df.columns:
            df = df[df['trait'].str.contains('flower', case=False, na=False)]
        
        # Skip if no data after filtering
        if df.empty:
            print(f"No flower-related data found in {csv_file}, skipping...")
            continue
            
        all_dataframes.append(df)
        print(f"Added {len(df)} records from {csv_file}")
        
    except Exception as e:
        print(f"Error processing {csv_file}: {e}")
        continue

# Combine all dataframes
if all_dataframes:
    df = pd.concat(all_dataframes, ignore_index=True)
    print(f"Combined total: {len(df)} records from all CSV files")
else:
    print("No valid data found in any CSV files")
    df = pd.DataFrame()

# Handle missing seasons - default to spring
df['season'] = df.get('season', 'spring')  # Use existing season column or default to spring
df['season'] = df['season'].fillna('spring')  # Fill any NaN values with spring

# If day column exists and season is missing, default to spring
if 'day' in df.columns:
    df.loc[df['day'].isna() | (df['day'] == ''), 'season'] = 'spring'

# For entries without season info, set to spring only
df.loc[df['season'].isna() | (df['season'] == ''), 'season'] = 'spring'

# Filter to keep only spring entries (as requested)
df = df[df['season'].str.lower() == 'spring']

# Handle missing years - create entries for 1975-2025
def expand_years_for_group(group_df):
    expanded_rows = []
    
    # Get existing years in the group
    existing_years = set(group_df['year'].dropna().astype(int))
    
    # Target years range
    target_years = set(range(1975, 2026))
    
    if not existing_years:
        # No year data at all - create entry for each year with same lat/long
        for year in target_years:
            for _, row in group_df.iterrows():
                new_row = row.copy()
                new_row['year'] = year
                new_row['season'] = 'spring'
                expanded_rows.append(new_row)
    else:
        # Filter existing data to 1975-2025 range
        valid_existing_years = existing_years.intersection(target_years)
        
        if valid_existing_years:
            # Add existing valid years
            for year in valid_existing_years:
                year_data = group_df[group_df['year'] == year]
                for _, row in year_data.iterrows():
                    new_row = row.copy()
                    new_row['season'] = 'spring'
                    expanded_rows.append(new_row)
        
        # Fill missing years by copying from nearest available year
        missing_years = target_years - valid_existing_years
        
        if missing_years and valid_existing_years:
            # Use the closest available year as template
            for missing_year in missing_years:
                # Find closest available year
                closest_year = min(valid_existing_years, key=lambda x: abs(x - missing_year))
                template_data = group_df[group_df['year'] == closest_year]
                
                for _, row in template_data.iterrows():
                    new_row = row.copy()
                    new_row['year'] = missing_year
                    new_row['season'] = 'spring'
                    expanded_rows.append(new_row)
        elif missing_years and not valid_existing_years:
            # No valid years in range, use any available year as template
            if existing_years:
                template_year = min(existing_years, key=lambda x: abs(x - 2000))  # Use closest to year 2000
                template_data = group_df[group_df['year'] == template_year]
                
                for missing_year in target_years:
                    for _, row in template_data.iterrows():
                        new_row = row.copy()
                        new_row['year'] = missing_year
                        new_row['season'] = 'spring'
                        expanded_rows.append(new_row)
    
    return pd.DataFrame(expanded_rows)

# Group by family and genus and expand years
grouped = df.groupby(['family', 'genus'])
all_expanded_rows = []

for (family, genus), group in grouped:
    expanded_group = expand_years_for_group(group)
    all_expanded_rows.append(expanded_group)

# Combine all expanded data
if all_expanded_rows:
    df = pd.concat(all_expanded_rows, ignore_index=True)
else:
    df = pd.DataFrame()  # Empty dataframe if no data

# Group by family and genus for final output
grouped = df.groupby(['family', 'genus'])

last_file = None
for (family, genus), group in grouped:
    # Create directory for family (lowercase)
    family_dir = family.lower()
    os.makedirs(os.path.join('../data/jsonl', family_dir), exist_ok=True)
    
    # Select relevant columns: year, season, latitude, longitude
    data = group[['year', 'season', 'latitude', 'longitude']]
    
    # Drop rows with missing values
    data = data.dropna()
    
    # Skip if no valid data
    if data.empty:
        continue
    
    # Save as JSON Lines for efficient processing (genus capitalized)
    genus_capitalized = genus.capitalize()
    filename = os.path.join('../data/jsonl', family_dir, f'{genus_capitalized}.jsonl')
    with open(filename, 'w') as f:
        for _, row in data.iterrows():
            json.dump({
                'year': int(row['year']),
                'season': row['season'],
                'lat': float(row['latitude']),
                'long': float(row['longitude'])
            }, f)
            f.write('\n')
    
    last_file = filename

print(f'Processing complete!')
print(f'Last file created: {last_file}')
print(f'Total CSV files processed: {len(csv_files)}')
print(f'Total families/genera processed: {len(list(grouped)) if "grouped" in locals() else 0}')