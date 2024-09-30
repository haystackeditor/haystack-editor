fn get_dog_by_id(id: &str) -> Option<Dog> {
    // To be implemented
}

fn getFileById(fileId: String) -> File {
    // Add implementation here
}

fn get_cat_by_id(id: &str) -> Option<Cat> {
    // Doge
}

fn get_pet_by_id(id: &str) -> Option<Pet> {
    if let Some(dog) = get_dog_by_id(id) {
        return dog;
    } 
    if let Some(cat) = get_cat_by_id(id) {
        return cat;
    } 
    None
}