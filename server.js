const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 1000;

// Middleware to parse JSON body
app.use(bodyParser.json());

// Function to load materials data from JSON file
const loadMaterialsData = () => {
    return JSON.parse(fs.readFileSync('materials.json', 'utf8'));
};

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// GET all materials
app.get('/odata/Materials', (req, res, next) => {
    try {
        const materialsData = loadMaterialsData();
        res.json(materialsData.materials);
    } catch (error) {
        next(error);
    }
});

// GET a specific material by ID
app.get('/odata/Materials/:materialId', (req, res, next) => {
    try {
        const materialsData = loadMaterialsData();
        const material = materialsData.materials.find(material => material.materialId === req.params.materialId);
        if (!material) return res.status(404).json({ message: 'Material not found' });
        res.json(material);
    } catch (error) {
        next(error);
    }
});

// POST a new material or update an existing one
app.post('/odata/Materials', (req, res, next) => {
    try {
        const materialsData = loadMaterialsData();
        const newMaterial = req.body;
        const existingMaterialIndex = materialsData.materials.findIndex(material => material.materialId === newMaterial.materialId);

        if (existingMaterialIndex !== -1) {
            // If material with the same ID exists, update it
            const existingMaterial = materialsData.materials[existingMaterialIndex];
            for (const key in newMaterial) {
                if (Object.prototype.hasOwnProperty.call(newMaterial, key)) {
                    existingMaterial[key] = newMaterial[key];
                }
            }
            fs.writeFileSync('materials.json', JSON.stringify(materialsData, null, 2));
            res.status(200).json({ message: `Material with ID '${newMaterial.materialId}' updated successfully` });
        } else {
            // If material with the same ID doesn't exist, create it
            materialsData.materials.push(newMaterial);
            fs.writeFileSync('materials.json', JSON.stringify(materialsData, null, 2));
            res.status(201).json({ message: `New material with ID '${newMaterial.materialId}' created successfully` });
        }
    } catch (error) {
        next(error);
    }
});

/// Array to store the IDs of materials that have been updated
const updatedMaterialIds = [];

// PUT (update) an existing material
app.put('/odata/Materials/:materialId', (req, res, next) => {
    try {
        const materialsData = loadMaterialsData();
        const materialId = req.params.materialId;
        const updatedMaterial = req.body;

        // Check if all required fields are present and not empty
        const requiredFields = ['description', 'category', 'unitPrice', 'currency'];
        const emptyFields = requiredFields.filter(field => {
            const value = updatedMaterial[field];
            return value === undefined || value === '';
        });

        if (emptyFields.length > 0) {
            console.error(`Error: ${emptyFields.join(', ')} cannot be empty`);
            return res.status(400).json({ message: `${emptyFields.join(', ')} cannot be empty` });
        }

        // Check if material with the given ID has already been updated
        if (updatedMaterialIds.includes(materialId)) {
            console.log(`Material with ID '${materialId}' has already been updated`);
            return res.status(400).json({ message: `Material with ID '${materialId}' has already been updated` });
        }

        // Find the index of the material with the provided materialId
        const materialIndex = materialsData.materials.findIndex(material => material.materialId === materialId);

        // If material with given ID exists, update it
        if (materialIndex !== -1) {
            materialsData.materials[materialIndex] = { ...materialsData.materials[materialIndex], ...updatedMaterial };
            updatedMaterialIds.push(materialId); // Add the ID to the updated list
            fs.writeFileSync('materials.json', JSON.stringify(materialsData, null, 2));
            console.log(`Material with ID '${materialId}' updated successfully`);
            res.json(materialsData.materials[materialIndex]);
        } else {
            res.status(404).json({ message: 'Material not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Something broke!');
    }
});

// DELETE a material
app.delete('/odata/Materials/:materialId', (req, res, next) => {
    try {
        const materialsData = loadMaterialsData();
        const materialIndex = materialsData.materials.findIndex(material => material.materialId === req.params.materialId);
        if (materialIndex === -1) return res.status(404).json({ message: 'Material not found' });
        const deletedMaterial = materialsData.materials.splice(materialIndex, 1);
        fs.writeFileSync('materials.json', JSON.stringify(materialsData, null, 2));
        res.json(deletedMaterial[0]);
    } catch (error) {
        next(error);
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Mock OData service is running on http://localhost:${PORT}`);
});
