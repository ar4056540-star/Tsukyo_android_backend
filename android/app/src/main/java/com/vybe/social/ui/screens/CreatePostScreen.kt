package com.vybe.social.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.vybe.social.data.ReelUploadEngine
import com.vybe.social.data.VybeRepository
import com.vybe.social.model.UserProfile
import com.vybe.social.ui.components.ExoPlayerView
import com.vybe.social.ui.theme.*
import kotlinx.coroutines.launch

enum class CreateMode {
    POST, REEL
}

@Composable
fun CreatePostScreen(
    repository: VybeRepository,
    currentProfile: UserProfile,
    onSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val uploadEngine = remember { ReelUploadEngine(context) }

    var selectedMode by remember { mutableStateOf(CreateMode.REEL) }
    var selectedMediaUri by remember { mutableStateOf<Uri?>(null) }
    var captionText by remember { mutableStateOf("") }
    var audioTitle by remember { mutableStateOf("Original Sound — VYBE") }

    // Real Byte Upload Progress State
    var isUploading by remember { mutableStateOf(false) }
    var uploadProgress by remember { mutableStateOf(0f) }
    var transferredBytes by remember { mutableStateOf(0L) }
    var totalBytes by remember { mutableStateOf(0L) }
    var uploadErrorMessage by remember { mutableStateOf<String?>(null) }

    // Native Photo / Video Media Picker
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            selectedMediaUri = uri
            uploadErrorMessage = null
        }
    }

    val videoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            selectedMediaUri = uri
            uploadErrorMessage = null
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(VybeDarkBg)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Mode Selector Tab (Post vs Reel)
        TabRow(
            selectedTabIndex = if (selectedMode == CreateMode.POST) 0 else 1,
            containerColor = VybeDarkSurface,
            contentColor = VybePink,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
        ) {
            Tab(
                selected = selectedMode == CreateMode.POST,
                onClick = {
                    selectedMode = CreateMode.POST
                    selectedMediaUri = null
                },
                text = { Text("New Post", fontWeight = FontWeight.Bold) }
            )
            Tab(
                selected = selectedMode == CreateMode.REEL,
                onClick = {
                    selectedMode = CreateMode.REEL
                    selectedMediaUri = null
                },
                text = { Text("New Reel", fontWeight = FontWeight.Bold) }
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Media Picker / Preview Box
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(320.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(VybeDarkSurface)
                .clickable {
                    if (selectedMode == CreateMode.REEL) {
                        videoPickerLauncher.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.VideoOnly)
                        )
                    } else {
                        photoPickerLauncher.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                        )
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            if (selectedMediaUri != null) {
                if (selectedMode == CreateMode.REEL) {
                    ExoPlayerView(
                        mediaUrl = selectedMediaUri.toString(),
                        modifier = Modifier.fillMaxSize(),
                        isMuted = false
                    )
                } else {
                    AsyncImage(
                        model = selectedMediaUri,
                        contentDescription = "Selected Media",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            } else {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = if (selectedMode == CreateMode.REEL) Icons.Default.Movie else Icons.Default.AddPhotoAlternate,
                        contentDescription = "Pick Media",
                        tint = VybePink,
                        modifier = Modifier.size(56.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (selectedMode == CreateMode.REEL) "Tap to select video for Reel" else "Tap to select photo for Post",
                        color = VybeTextSecondary,
                        fontSize = 14.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Caption Input Field
        OutlinedTextField(
            value = captionText,
            onValueChange = { captionText = it },
            placeholder = { Text("Write a caption... #vybe", color = VybeTextMuted) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = VybeDarkSurface,
                unfocusedContainerColor = VybeDarkSurface,
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                focusedBorderColor = VybePink,
                unfocusedBorderColor = VybeDarkBorder
            ),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            minLines = 3
        )

        if (selectedMode == CreateMode.REEL) {
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = audioTitle,
                onValueChange = { audioTitle = it },
                label = { Text("Audio Track Name", color = VybeTextSecondary) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = VybeDarkSurface,
                    unfocusedContainerColor = VybeDarkSurface,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = VybePink,
                    unfocusedBorderColor = VybeDarkBorder
                ),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )
        }

        // Upload Progress Bar with Byte-level details
        if (isUploading) {
            Spacer(modifier = Modifier.height(16.dp))
            LinearProgressIndicator(
                progress = uploadProgress,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = VybePink,
                trackColor = VybeDarkBorder
            )
            Spacer(modifier = Modifier.height(6.dp))
            val percent = (uploadProgress * 100).toInt()
            val kbTransferred = transferredBytes / 1024
            val kbTotal = totalBytes / 1024
            Text(
                text = "Uploading: $percent% (${kbTransferred}KB / ${kbTotal}KB)",
                color = VybeTextSecondary,
                fontSize = 12.sp
            )
        }

        if (uploadErrorMessage != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = uploadErrorMessage ?: "",
                color = Color.Red,
                fontSize = 12.sp
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Publish Button
        Button(
            onClick = {
                val uri = selectedMediaUri ?: return@Button
                isUploading = true
                uploadErrorMessage = null

                coroutineScope.launch {
                    val uploadResult = uploadEngine.uploadVideo(uri) { prog, transferred, total ->
                        uploadProgress = prog
                        transferredBytes = transferred
                        totalBytes = total
                    }

                    uploadResult.onSuccess { res ->
                        if (selectedMode == CreateMode.REEL) {
                            val creation = repository.createReel(
                                ownerId = currentProfile.userId,
                                username = currentProfile.username,
                                displayName = currentProfile.displayName,
                                photoURL = currentProfile.photoURL,
                                caption = captionText,
                                mediaURL = res.mediaUrl,
                                audioTitle = audioTitle
                            )
                            isUploading = false
                            creation.onSuccess { onSuccess() }
                                .onFailure { uploadErrorMessage = "Failed to save Reel: ${it.message}" }
                        } else {
                            val creation = repository.createPost(
                                userId = currentProfile.userId,
                                username = currentProfile.username,
                                displayName = currentProfile.displayName,
                                photoURL = currentProfile.photoURL,
                                caption = captionText,
                                mediaURL = res.mediaUrl,
                                mediaType = "image"
                            )
                            isUploading = false
                            creation.onSuccess { onSuccess() }
                                .onFailure { uploadErrorMessage = "Failed to save Post: ${it.message}" }
                        }
                    }.onFailure { err ->
                        isUploading = false
                        uploadErrorMessage = "Upload failed: ${err.message}"
                    }
                }
            },
            enabled = selectedMediaUri != null && !isUploading,
            colors = ButtonDefaults.buttonColors(
                containerColor = VybePink,
                disabledContainerColor = VybePink.copy(alpha = 0.4f)
            ),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Text(
                text = if (selectedMode == CreateMode.REEL) "Share Reel" else "Share Post",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )
        }
    }
}
