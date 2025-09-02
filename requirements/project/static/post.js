export async function POST(id, userstate) {
    
    try {

      const res = await fetch(`/post?Id=${id}`);
      if (!res.ok) throw new Error("Failed to fetch post");

      const post = await res.json();
      console.log("Fetched single post:", post);

    } catch (err) {
      
        console.error("Error fetching single post:", err);
    
    }
  }