// Mock complete tree data for testing advanced visualization
export const mockCompleteTreeData = {
  "data": {
    "id": "0199615f-34e4-72af-a1ed-6683dc957b99",
    "name": "Test Family Tree",
    "description": "Test family for advanced visualization",
    "privacy": "private",
    "generations": {
      "1": {
        "name": "Grandparents",
        "people": [
          {
            "id": "01996161-ad79-77dc-a1a3-c688c5e7bf99",
            "first_name": "John",
            "last_name": "Smith", 
            "birth_date": "1950-01-15",
            "gender": "M",
            "spouses": [
              {
                "id": "01996161-c7db-7d46-ad84-f7b5a9ad6b99",
                "first_name": "Mary",
                "last_name": "Johnson",
                "birth_date": "1952-03-20",
                "gender": "F",
                "marriage_date": "1974-06-15",
                "marriage_place": "Springfield, IL"
              }
            ],
            "children": [
              {
                "id": "01996161-dc42-7b9f-8a90-e4f6b9d5c799",
                "first_name": "Robert",
                "last_name": "Smith",
                "birth_date": "1975-08-10",
                "gender": "M"
              }
            ]
          }
        ]
      },
      "2": {
        "name": "Parents", 
        "people": [
          {
            "id": "01996161-dc42-7b9f-8a90-e4f6b9d5c799",
            "first_name": "Robert",
            "last_name": "Smith",
            "birth_date": "1975-08-10", 
            "gender": "M",
            "spouses": [
              {
                "id": "01996161-f2e8-7156-85e4-a99d8e6c5b99",
                "first_name": "Lisa",
                "last_name": "Williams",
                "birth_date": "1978-12-05",
                "gender": "F",
                "marriage_date": "2002-05-20",
                "marriage_place": "Chicago, IL"
              }
            ],
            "children": [
              {
                "id": "01996162-0574-743e-9d8c-b5a7c4e2d199",
                "first_name": "Emily",
                "last_name": "Smith",
                "birth_date": "2005-03-12",
                "gender": "F"
              },
              {
                "id": "01996162-1a85-7bc2-a7d5-c9e8f6b3a499",
                "first_name": "Michael", 
                "last_name": "Smith",
                "birth_date": "2008-11-08",
                "gender": "M"
              }
            ]
          }
        ]
      },
      "3": {
        "name": "Children",
        "people": [
          {
            "id": "01996162-0574-743e-9d8c-b5a7c4e2d199",
            "first_name": "Emily",
            "last_name": "Smith",
            "birth_date": "2005-03-12",
            "gender": "F",
            "spouses": [],
            "children": []
          },
          {
            "id": "01996162-1a85-7bc2-a7d5-c9e8f6b3a499",
            "first_name": "Michael",
            "last_name": "Smith", 
            "birth_date": "2008-11-08",
            "gender": "M",
            "spouses": [],
            "children": []
          }
        ]
      }
    },
    "focus_person": "01996161-ad79-77dc-a1a3-c688c5e7bf99",
    "generation_limits": {
      "up": 2,
      "down": 2
    },
    "total_people": 6,
    "total_relationships": 2
  }
};