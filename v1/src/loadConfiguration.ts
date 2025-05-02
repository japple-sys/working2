import * as fs from 'fs';
import * as path from 'path';
import { JsonConfig } from './customInterfaces';


// Define a function to read the JSON file
export async function loadConfiguration(): Promise<JsonConfig> {
    try {
        // Resolve the path to the JSON file
        const filePath = path.resolve(__dirname, '../ct_configuration.json');
        
        // Read the file synchronously
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        // Parse the JSON content
        const jsonData: JsonConfig = JSON.parse(fileContent);
        
        return jsonData;
    } catch (error) {
        console.error('Error reading the JSON file:', error);
        throw error;
    }
}

